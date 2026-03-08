import { getCurrentUser } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Bem-vindo(a)</h3>
          <p className="text-xl font-semibold text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500 mt-1">{user.company.name}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Cargo</h3>
          <p className="text-xl font-semibold text-gray-900">{user.jobTitle || 'Não definido'}</p>
          <p className="text-sm text-gray-500 mt-1">{user.department || 'Sem departamento'}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Perfil</h3>
          <p className="text-xl font-semibold text-gray-900">
            {user.role === 'ADMIN'
              ? 'Administrador'
              : user.role === 'MANAGER'
                ? 'Gestor'
                : 'Colaborador'}
          </p>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>
        <p className="text-gray-600">
          Os módulos de avaliação de desempenho, feedback, OKRs, pesquisas e mural serão exibidos
          aqui conforme forem implementados.
        </p>
      </div>
    </div>
  );
}
