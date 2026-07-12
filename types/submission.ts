export type SubmissionStatus =
  | "pending"
  | "approved"
  | "rejected";

export type DeckSubmission = {
  id: string;
  slug: string;
  author_name: string;
  contact: string | null;
  deck_name: string;
  series: string;
  color: string;
  deck_type: string;
  deck_code: string | null;
  deck_link: string | null;
  description: string;
  strategy: string;
  image_url: string;
  image_path: string;
  status: SubmissionStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};
