import DonatePage from "../../../../ummat/shared/donate/src/DonatePage";

export const metadata = {
  title: "Support ChatIslam — Keep Islamic AI Free",
  description: "Help keep ChatIslam free for Muslims seeking Islamic guidance. Your donation funds AI infrastructure.",
};

export default function ChatIslamDonatePage() {
  return (
    <DonatePage
      designation="chatislam"
      productName="ChatIslam"
      tagline="Support ChatIslam — keep Islamic AI guidance free for all"
      accentColor="#79C24C"
      checkoutApiPath="/api/donations/checkout"
    />
  );
}
