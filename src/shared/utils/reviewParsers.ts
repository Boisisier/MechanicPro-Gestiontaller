import { ReviewPartItem, ReviewServiceItem } from "../lib/types";

const reviewPartPrefix = "[REPUESTO]";

export const parseStoredReviewServices = (
  services: string[] = [],
): ReviewServiceItem[] =>
  services
    .filter((service) => !service.startsWith(reviewPartPrefix))
    .map((service) => {
      const match = service.match(/^(.*?)\s*\(\$\s*([^)]+)\)\s*$/);
      return {
        name: match?.[1]?.trim() || service,
        price: match?.[2]?.replace(/[^\d]/g, "") || "",
      };
    });

export const serializeReviewService = ({ name, price }: ReviewServiceItem) =>
  price.trim() ? `${name} ($${price.trim()})` : name;

export const parseStoredReviewParts = (
  services: string[] = [],
): ReviewPartItem[] =>
  services
    .filter((service) => service.startsWith(reviewPartPrefix))
    .map((service) => {
      const [
        inventoryItemId = "",
        name = "",
        sku = "",
        quantity = "1",
        unit = "unidad",
        unitCost = "0",
        location = "",
        itemType = "repuesto",
      ] = service
        .replace(reviewPartPrefix, "")
        .trim()
        .split("|")
        .map((value) => value.trim());
      return {
        inventoryItemId,
        name,
        sku,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        unit,
        unitCost: parseInt(unitCost, 10) || 0,
        location,
        itemType: (itemType === "insumo" ? "insumo" : "repuesto") as
          | "repuesto"
          | "insumo",
      };
    })
    .filter((part) => part.inventoryItemId && part.name);

export const serializeReviewPart = (part: ReviewPartItem) =>
  `${reviewPartPrefix} ${[
    part.inventoryItemId,
    part.name,
    part.sku,
    part.quantity,
    part.unit,
    part.unitCost,
    part.location,
    part.itemType || "repuesto",
  ].join("|")}`;
