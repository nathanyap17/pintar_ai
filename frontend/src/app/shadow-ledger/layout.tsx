import AppLayout from "@/components/AppLayout";

export default function ShadowLedgerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppLayout>{children}</AppLayout>;
}
