import { SITE } from "./site";

type CheckoutParams = {
  content: string; // hero | mid | footer | faq | etc.
  campaign?: string;
  medium?: string;
};

export function getCheckoutUrl(params: CheckoutParams): string {
  const base = SITE.checkoutBaseUrl;
  const url = new URL(base);

  url.searchParams.set("utm_source", SITE.utm.source);
  url.searchParams.set("utm_medium", params.medium ?? SITE.utm.medium);
  url.searchParams.set("utm_campaign", params.campaign ?? SITE.utm.campaign);
  url.searchParams.set("utm_content", params.content);

  return url.toString();
}
