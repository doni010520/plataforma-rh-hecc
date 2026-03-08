import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const pendingAssignments = await prisma.reviewAssignment.findMany({
    where: {
      evaluatorId: user.id,
      status: 'PENDING',
      cycle: { status: 'ACTIVE', companyId: user.companyId },
    },
    include: {
      cycle: { select: { name: true, endDate: true } },
      evaluatee: { select: { name: true } },
    },
    take: 5,
  });

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
          <p className="text-sm text-gray-500 mt-1">{user.department?.name || 'Sem departamento'}</p>
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

      {pendingAssignments.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Avaliações Pendentes ({pendingAssignments.length})
          </h2>
          <div className="space-y-3">
            {pendingAssignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between border border-gray-200 rounded-md p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Avaliar: {a.evaluatee.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.cycle.name} &middot; Prazo:{' '}
                    {new Date(a.cycle.endDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Link
                  href={`/avaliacoes/responder/${a.id}`}
                  className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 font-medium"
                >
                  Responder
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>
        <p className="text-gray-600">
          Os módulos de feedback, OKRs, pesquisas e mural serão exibidos aqui conforme forem
          implementados.
        </p>
      </div>
    </div>
  );
}
