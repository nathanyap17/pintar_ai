import AppLayout from "@/components/AppLayout";

export default function CustomsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppLayout>{children}</AppLayout>;
}
