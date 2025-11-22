export interface Review {
  username: string;
  comment: string;
  rating: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  summary: string;
  price: string;
  coverImageUrl: string;
  category: string;
  rating: number;
  reviews: Review[];
  publicationDate: string;
  pages: number;
  isBestseller?: boolean;
}
