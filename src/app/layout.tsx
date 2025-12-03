export const metadata = {
  title: "Retoro Backend API",
  description: "Backend API for Retoro iOS app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
