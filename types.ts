
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
  email?: string;
  shippingAddress?: string;
  shirtSize?: string;
  gender?: string;
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
  SCRAPER,
}
