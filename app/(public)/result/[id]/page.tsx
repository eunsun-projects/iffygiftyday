import EachResultTemplate from "@/components/templates/EachResultTemplate";

interface EachResultPageProps {
	params: Promise<{ id: string }>;
}

async function EachResultPage({ params }: EachResultPageProps) {
	const { id } = await params;
	return <EachResultTemplate id={id} />;
}

export default EachResultPage;
