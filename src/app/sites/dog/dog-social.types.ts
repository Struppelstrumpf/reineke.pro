export type DogProfileDog = {
  id: string;
  name: string;
  breed: string;
  size: string;
  weightKg: number;
  traits: string;
  createdAt: string;
};

export type DogFriend = {
  userId: string;
  name: string;
  since: string;
};

export type DogFriendRequestIn = {
  id: string;
  userId: string;
  name: string;
  at: string;
};

export type DogFriendRequestOut = {
  userId: string;
  name: string;
  at: string;
};

export type DogSocialState = {
  friends: DogFriend[];
  requestsIn: DogFriendRequestIn[];
  requestsOut: DogFriendRequestOut[];
};

export type DogLocationShare = {
  lat: number;
  lng: number;
  radiusKm: number;
  expiresAt: string;
  updatedAt: string;
};

export type DogNearbyUser = {
  id: string;
  name: string;
  avatarUrl: string;
  distanceKm: number;
  dogs: DogProfileDog[];
  isFriend: boolean;
  requestPending: boolean;
  sharingUntil: string;
};

export type DogMeetupInvite = {
  userId: string;
  name: string;
  status: 'pending' | 'accepted' | 'declined';
};

export type DogMeetup = {
  id: string;
  hostUserId: string;
  hostName: string;
  spotId: string;
  spotName: string;
  lat: number;
  lng: number;
  scheduledAt: string;
  message: string;
  invites: DogMeetupInvite[];
  createdAt: string;
};

export type DogNotification = {
  id: string;
  read: boolean;
  createdAt: string;
  type: string;
  title: string;
  body: string;
  fromUserId?: string;
  requestId?: string;
  meetupId?: string;
};

export type DogMeetupDraft = {
  spotId: string;
  spotName: string;
  lat: number;
  lng: number;
};

export type FriendsHubTab = 'discover' | 'dogs' | 'friends' | 'meetups';
