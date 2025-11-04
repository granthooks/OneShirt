
export interface Shirt {
  id: string;
  name: string;
  imageUrl: string; 
  currentBidCount: number;
  bidThreshold: number;
  designer?: string;
  likes?: number;
}

export interface User {
  name: string;
  avatarUrl: string;
  creditBalance: number;
  isAdmin?: boolean;
}

export enum AppView {
  SWIPE,
  ADMIN,
}

export enum AdminPage {
  DASHBOARD,
  INVENTORY,
  GENERATE,
  USERS,
  ORDERS,
}
