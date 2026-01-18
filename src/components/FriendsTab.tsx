import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Bell, Settings, Search, X, Check, Clock, Eye, EyeOff, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function FriendsTab() {
  const {
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
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    user_id: string;
    username: string | null;
    display_name: string | null;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsUsername, setSettingsUsername] = useState("");
  const [settingsDisplayName, setSettingsDisplayName] = useState("");
  const [settingsVisibility, setSettingsVisibility] = useState("private");
  const [friendToRemove, setFriendToRemove] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResult(null);
    
    try {
      // Use the secure search function from useFriends hook
      const result = await searchUser(searchQuery.trim());

      if (result) {
        setSearchResult(result);
      } else {
        toast.error("User not found. Make sure they have set a username.");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    
    const success = await sendFriendRequest(searchResult.user_id);
    if (success) {
      setSearchResult(null);
      setSearchQuery("");
    }
  };

  const openSettings = () => {
    setSettingsUsername(profile?.username || "");
    setSettingsDisplayName(profile?.display_name || "");
    setSettingsVisibility(profile?.schedule_visibility || "private");
    setShowSettingsDialog(true);
  };

  const handleSaveSettings = async () => {
    const success = await updateProfile({
      username: settingsUsername.trim() || undefined,
      display_name: settingsDisplayName.trim() || undefined,
      schedule_visibility: settingsVisibility,
    });
    
    if (success) {
      setShowSettingsDialog(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendToRemove) return;
    await removeFriend(friendToRemove);
    setFriendToRemove(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Friends</h2>
          {incomingRequests.length > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center">
              {incomingRequests.length}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={openSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Username setup prompt */}
      {!profile?.username && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/10 border border-primary/20"
        >
          <p className="text-sm text-primary mb-2">
            <strong>Set up your username</strong> to let friends find and add you!
          </p>
          <Button size="sm" onClick={openSettings}>
            Set Username
          </Button>
        </motion.div>
      )}

      {/* Search for friends */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">Add a friend by username</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? "..." : "Search"}
          </Button>
        </div>

        {/* Search result */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
            >
              <div>
                <p className="font-medium">
                  {searchResult.display_name || searchResult.username}
                </p>
                <p className="text-sm text-muted-foreground">@{searchResult.username}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSendRequest}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSearchResult(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs for Requests and Friends */}
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="friends" className="flex gap-2">
            <Users className="h-4 w-4" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex gap-2">
            <Bell className="h-4 w-4" />
            Requests
            {incomingRequests.length > 0 && (
              <Badge variant="destructive" className="h-4 min-w-4 text-xs">
                {incomingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Friends List */}
        <TabsContent value="friends" className="mt-4 space-y-2">
          {friends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No friends yet</p>
              <p className="text-sm">Search for users by their username to add them!</p>
            </div>
          ) : (
            friends.map((friendship) => (
              <motion.div
                key={friendship.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {(friendship.friend_profile?.display_name || 
                        friendship.friend_profile?.username || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {friendship.friend_profile?.display_name || friendship.friend_profile?.username || "Unknown"}
                    </p>
                    {friendship.friend_profile?.username && (
                      <p className="text-sm text-muted-foreground">@{friendship.friend_profile.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {friendship.friend_profile?.schedule_visibility === "public" ? (
                    <Badge variant="outline" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Schedule visible
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setFriendToRemove(
                      friendship.user_id === profile?.user_id 
                        ? friendship.friend_id 
                        : friendship.user_id
                    )}
                  >
                    <UserMinus className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests" className="mt-4 space-y-4">
          {/* Incoming Requests */}
          {incomingRequests.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Incoming Requests</Label>
              {incomingRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <div>
                    <p className="font-medium">
                      {request.from_profile?.display_name || request.from_profile?.username || "Unknown"}
                    </p>
                    {request.from_profile?.username && (
                      <p className="text-sm text-muted-foreground">@{request.from_profile.username}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => acceptFriendRequest(request.id)}>
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => rejectFriendRequest(request.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Outgoing Requests */}
          {outgoingRequests.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Sent Requests</Label>
              {outgoingRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {request.to_profile?.display_name || request.to_profile?.username || "Unknown"}
                      </p>
                      {request.to_profile?.username && (
                        <p className="text-sm text-muted-foreground">@{request.to_profile.username}</p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => cancelFriendRequest(request.id)}>
                    Cancel
                  </Button>
                </motion.div>
              ))}
            </div>
          )}

          {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending requests</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Choose a unique username"
                value={settingsUsername}
                onChange={(e) => setSettingsUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Your display name"
                value={settingsDisplayName}
                onChange={(e) => setSettingsDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Schedule Visibility</Label>
              <Select value={settingsVisibility} onValueChange={setSettingsVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Private - Only you can see your schedule
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Public - Friends can see your schedule
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Friend Confirmation */}
      <AlertDialog open={!!friendToRemove} onOpenChange={() => setFriendToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this friend? They will no longer be able to see your schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFriend}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
