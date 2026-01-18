import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  schedule_visibility: string;
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend_profile?: Profile;
}

export function useFriends() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch all friend data
  const fetchData = useCallback(async () => {
    if (!userId) {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch user's profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, schedule_visibility")
        .eq("user_id", userId)
        .single();
      
      setProfile(profileData);

      // Fetch friendships with friend profiles
      const { data: friendshipsData } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (friendshipsData) {
        // Get friend user IDs (dedupe - each friend should only appear once)
        const friendUserIds = [...new Set(friendshipsData.map(f => 
          f.user_id === userId ? f.friend_id : f.user_id
        ))];

        // Fetch friend profiles
        if (friendUserIds.length > 0) {
          const { data: friendProfiles } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, schedule_visibility")
            .in("user_id", friendUserIds);

          // Dedupe friendships by friend_id - only keep one record per friend
          const seenFriends = new Set<string>();
          const friendsWithProfiles = friendshipsData
            .map(f => {
              const friendId = f.user_id === userId ? f.friend_id : f.user_id;
              return {
                ...f,
                friend_id: friendId, // Normalize friend_id
                friend_profile: friendProfiles?.find(p => p.user_id === friendId)
              };
            })
            .filter(f => {
              const friendId = f.friend_profile?.user_id;
              if (!friendId || seenFriends.has(friendId)) return false;
              seenFriends.add(friendId);
              return true;
            });
          setFriends(friendsWithProfiles);
        } else {
          setFriends([]);
        }
      }

      // Fetch incoming friend requests
      const { data: incomingData } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("to_user_id", userId)
        .eq("status", "pending");

      if (incomingData && incomingData.length > 0) {
        const fromUserIds = incomingData.map(r => r.from_user_id);
        // Use profiles_public view to fetch sender profiles (since they're not friends yet)
        const { data: fromProfiles } = await supabase
          .from("profiles_public")
          .select("user_id, username, display_name, schedule_visibility")
          .in("user_id", fromUserIds);

        const requestsWithProfiles = incomingData.map(r => ({
          ...r,
          from_profile: fromProfiles?.find(p => p.user_id === r.from_user_id)
        }));
        setIncomingRequests(requestsWithProfiles);
      } else {
        setIncomingRequests([]);
      }

      // Fetch outgoing friend requests
      const { data: outgoingData } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("from_user_id", userId)
        .eq("status", "pending");

      if (outgoingData && outgoingData.length > 0) {
        const toUserIds = outgoingData.map(r => r.to_user_id);
        // Use profiles_public view to fetch recipient profiles (since they're not friends yet)
        const { data: toProfiles } = await supabase
          .from("profiles_public")
          .select("user_id, username, display_name, schedule_visibility")
          .in("user_id", toUserIds);

        const requestsWithProfiles = outgoingData.map(r => ({
          ...r,
          to_profile: toProfiles?.find(p => p.user_id === r.to_user_id)
        }));
        setOutgoingRequests(requestsWithProfiles);
      } else {
        setOutgoingRequests([]);
      }
    } catch (error) {
      console.error("Error fetching friend data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update user profile
  const updateProfile = useCallback(async (updates: {
    username?: string;
    display_name?: string;
    schedule_visibility?: string;
  }) => {
    if (!userId) {
      toast.error("Please sign in");
      return false;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);

      if (error) {
        if (error.code === "23505") {
          toast.error("Username is already taken");
        } else {
          throw error;
        }
        return false;
      }

      toast.success("Profile updated");
      await fetchData();
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
      return false;
    }
  }, [userId, fetchData]);

  // Search for user by username (uses security definer function for privacy)
  const searchUser = useCallback(async (query: string): Promise<Profile | null> => {
    if (!query.trim()) return null;

    try {
      // Use the secure search function that only returns limited profile data
      const { data, error } = await supabase.rpc('search_users_by_username', {
        search_query: query.trim()
      });

      if (error) {
        console.error("Search error:", error);
        return null;
      }

      // Return the first result with a default schedule_visibility
      if (data && data.length > 0) {
        return {
          user_id: data[0].user_id,
          username: data[0].username,
          display_name: data[0].display_name,
          schedule_visibility: 'private' // Default - actual visibility is checked server-side
        };
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  // Send friend request
  const sendFriendRequest = useCallback(async (toUserId: string) => {
    if (!userId) {
      toast.error("Please sign in");
      return false;
    }

    if (toUserId === userId) {
      toast.error("You cannot send a friend request to yourself");
      return false;
    }

    // Check if already friends
    const existingFriend = friends.find(f => 
      f.user_id === toUserId || f.friend_id === toUserId
    );
    if (existingFriend) {
      toast.error("You are already friends with this user");
      return false;
    }

    // Check for existing request
    const existingOutgoing = outgoingRequests.find(r => r.to_user_id === toUserId);
    if (existingOutgoing) {
      toast.error("Friend request already sent");
      return false;
    }

    try {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          from_user_id: userId,
          to_user_id: toUserId,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Friend request already exists");
        } else {
          throw error;
        }
        return false;
      }

      toast.success("Friend request sent!");
      await fetchData();
      return true;
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
      return false;
    }
  }, [userId, friends, outgoingRequests, fetchData]);

  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId: string) => {
    if (!userId) return false;

    try {
      // Get the request
      const request = incomingRequests.find(r => r.id === requestId);
      if (!request) {
        toast.error("Request not found");
        return false;
      }

      // Update request status first
      const { error: updateError } = await supabase
        .from("friend_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Create friendship for current user (this one should always succeed)
      const { error: friendshipError1 } = await supabase
        .from("friendships")
        .upsert({
          user_id: userId,
          friend_id: request.from_user_id,
        }, { onConflict: 'user_id,friend_id' });

      // Ignore errors for this insert - the RLS policy now allows it after status is 'accepted'
      if (friendshipError1 && friendshipError1.code !== "23505") {
        console.warn("Friendship insert 1 warning:", friendshipError1);
      }

      // Create reverse friendship record
      const { error: friendshipError2 } = await supabase
        .from("friendships")
        .upsert({
          user_id: request.from_user_id,
          friend_id: userId,
        }, { onConflict: 'user_id,friend_id' });

      if (friendshipError2 && friendshipError2.code !== "23505") {
        console.warn("Friendship insert 2 warning:", friendshipError2);
      }

      toast.success("Friend request accepted!");
      await fetchData();
      return true;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request");
      return false;
    }
  }, [userId, incomingRequests, fetchData]);

  // Reject friend request
  const rejectFriendRequest = useCallback(async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Friend request declined");
      await fetchData();
      return true;
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Failed to decline friend request");
      return false;
    }
  }, [fetchData]);

  // Cancel outgoing friend request
  const cancelFriendRequest = useCallback(async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Friend request cancelled");
      await fetchData();
      return true;
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast.error("Failed to cancel friend request");
      return false;
    }
  }, [fetchData]);

  // Remove friend
  const removeFriend = useCallback(async (friendId: string) => {
    if (!userId) return false;

    try {
      // Delete both directions of friendship
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

      if (error) throw error;

      toast.success("Friend removed");
      await fetchData();
      return true;
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
      return false;
    }
  }, [userId, fetchData]);

  // Get friend's schedule (if visibility allows) - includes both classes and planned events
  const getFriendSchedule = useCallback(async (friendUserId: string, startDate?: string, endDate?: string) => {
    if (!userId) {
      return null;
    }

    try {
      // Use the security definer function to get friend's class schedules
      const { data: classSchedules, error: classError } = await supabase
        .rpc("get_friend_class_schedules", { friend_user_id: friendUserId });

      if (classError) {
        console.error("Error fetching friend class schedules:", classError);
      }

      // Get friend's planned events for the current week
      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      const start = startDate || today.toISOString().split('T')[0];
      const end = endDate || weekFromNow.toISOString().split('T')[0];

      const { data: plannedEvents, error: eventsError } = await supabase
        .rpc("get_friend_planned_events", { 
          friend_user_id: friendUserId,
          start_date: start,
          end_date: end
        });

      if (eventsError) {
        console.error("Error fetching friend planned events:", eventsError);
      }

      return {
        classSchedules: classSchedules || [],
        plannedEvents: plannedEvents || [],
        assignments: [], // Don't expose assignments to friends for privacy
      };
    } catch (error) {
      console.error("Error fetching friend schedule:", error);
      return null;
    }
  }, [userId]);

  return {
    userId,
    profile,
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    updateProfile,
    searchUser,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendSchedule,
    refetch: fetchData,
  };
}
