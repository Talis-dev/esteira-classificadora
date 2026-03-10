// Força renderização dinâmica para evitar 404 em produção
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
