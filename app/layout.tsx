import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { ORG_NAME, ORG_EIN, SITE_URL } from "@/lib/format";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Give to Light", template: "%s · Give to Light" },
  description: `Support ${ORG_NAME}: campaigns, teams and ambassadors raising money for young women in Monsey and Pomona.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Instrument+Sans:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div className="wrap">
            {ORG_NAME} is a 501(c)(3) nonprofit, EIN {ORG_EIN}. Donations are tax-deductible as allowed by law.
          </div>
        </footer>
      </body>
    </html>
  );
}
