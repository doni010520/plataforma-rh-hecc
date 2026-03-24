import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AiChatWrapper } from '@/components/AiChatWrapper';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Pass user data to client components to avoid redundant API calls
  const userData = {
    id: user.id,
    name: user.name ?? 'Usuário',
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    companyId: user.companyId,
  };

  return (
    <div className="min-h-screen">
      <Sidebar userRole={userData.role} />
      <Header userName={userData.name} avatarUrl={userData.avatarUrl} />
      <main className="md:ml-64 mt-16 p-4 md:p-6">{children}</main>
      <AiChatWrapper userRole={userData.role} />
    </div>
  );
}
