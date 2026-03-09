import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header userName={user.name} avatarUrl={user.avatarUrl} />
      <main className="md:ml-64 mt-16 p-4 md:p-6">{children}</main>
    </div>
  );
}
