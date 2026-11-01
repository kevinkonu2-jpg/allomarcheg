import { createFileRoute } from "@tanstack/react-router";
import { ProductCatalog } from "@/components/ProductCatalog";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [
    { title: "Catalogue — Allô Marché Global" },
    { name: "description", content: "Tous les produits de votre ville et la sélection Partenaire Amazon." },
    { property: "og:title", content: "Catalogue — Allô Marché Global" },
    { property: "og:description", content: "Parcourez les articles locaux et la sélection Amazon." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProductCatalog,
});
