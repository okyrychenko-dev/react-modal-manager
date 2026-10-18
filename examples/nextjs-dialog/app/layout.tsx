import type { PropsWithChildren, ReactNode } from "react";
import "./styles.css";

export default function RootLayout(props: PropsWithChildren): ReactNode {
  const { children } = props;

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
