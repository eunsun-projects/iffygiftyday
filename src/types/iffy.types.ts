export type Iffy = {
	age: number;
	is_person: boolean;
	desc: string;
	gift_name: string;
	brand: string;
	gift_image_url: string;
	commentary: string;
	link: string;
	humor: string;
	is_error: boolean;
	user_id: string | null;
};

export type IffyResponse = Iffy;

export interface LoadingState {
	open: boolean;
	isError: boolean;
}
