'use client';

import { useState } from 'react';

interface HelpTopic {
  title: string;
  icon: string;
  items: { question: string; answer: string }[];
}

const topics: HelpTopic[] = [
  {
    title: 'Primeiros Passos',
    icon: '🚀',
    items: [
      {
        question: 'Como acessar a plataforma?',
        answer:
          'Utilize o email cadastrado pelo administrador da sua empresa para fazer login. Caso seja seu primeiro acesso, verifique sua caixa de entrada (e spam) por um convite com instruções para definir sua senha.',
      },
      {
        question: 'Como editar meu perfil?',
        answer:
          'Clique no seu nome/avatar no canto superior direito ou acesse a página "Perfil" no menu lateral. Lá você pode atualizar sua foto, cargo e informações pessoais.',
      },
      {
        question: 'O que significam os perfis (Colaborador, Gestor, Administrador)?',
        answer:
          'Colaborador: acessa funcionalidades do dia a dia (feedback, OKRs, avaliações). Gestor: além do acesso de colaborador, visualiza dados da equipe e gerencia liderados. Administrador: acesso completo, incluindo configurações, permissões e relatórios.',
      },
    ],
  },
  {
    title: 'Dashboard',
    icon: '📊',
    items: [
      {
        question: 'O que é o Dashboard?',
        answer:
          'É sua página inicial com um resumo de tudo que é importante: seu perfil, cargo, humor diário, OKRs, e (para gestores) a visão da equipe com métricas de engajamento.',
      },
      {
        question: 'O que é o widget de humor?',
        answer:
          'Permite registrar como você está se sentindo hoje. Esses dados ajudam a gestão a acompanhar o bem-estar da equipe de forma agregada e anônima.',
      },
    ],
  },
  {
    title: 'Avaliações de Desempenho',
    icon: '📋',
    items: [
      {
        question: 'Como responder a uma avaliação?',
        answer:
          'Quando houver avaliações pendentes, um banner aparecerá no Dashboard. Clique em "Responder" para acessar o formulário. Responda cada pergunta na escala indicada e clique em "Enviar" ao final.',
      },
      {
        question: 'As avaliações são anônimas?',
        answer:
          'Depende da configuração feita pelo administrador. Quando a avaliação é anônima, suas respostas individuais não serão identificadas — apenas os resultados agregados serão visíveis.',
      },
    ],
  },
  {
    title: 'Feedback',
    icon: '💬',
    items: [
      {
        question: 'Como enviar feedback?',
        answer:
          'Acesse "Feedback" no menu lateral, clique em "Novo Feedback", selecione o destinatário, o tipo (elogio, sugestão, construtivo) e escreva sua mensagem.',
      },
      {
        question: 'Meu feedback é confidencial?',
        answer:
          'Feedback enviado é visível para o destinatário e para administradores/gestores. Se quiser enviar algo anônimo, verifique se a opção está disponível na configuração da sua empresa.',
      },
    ],
  },
  {
    title: 'OKRs',
    icon: '🎯',
    items: [
      {
        question: 'O que são OKRs?',
        answer:
          'OKRs (Objectives and Key Results) são uma metodologia de definição de metas. Cada "Objetivo" descreve o que você quer alcançar, e os "Resultados-Chave" medem como saber se você chegou lá.',
      },
      {
        question: 'Como criar um OKR?',
        answer:
          'Acesse "OKRs" no menu, clique em "Novo Objetivo", preencha o título e adicione os resultados-chave com metas mensuráveis. Atualize o progresso regularmente.',
      },
    ],
  },
  {
    title: 'Mural de Celebrações',
    icon: '⭐',
    items: [
      {
        question: 'Como publicar no mural?',
        answer:
          'Clique em "+ Celebrar", escolha o tipo de publicação (geral, conquista, aniversário), escreva sua mensagem e opcionalmente adicione fotos ou vídeos. Clique em "Publicar".',
      },
      {
        question: 'Como mencionar colegas?',
        answer:
          'No campo de texto, digite @ seguido do nome do colega. Uma lista de sugestões aparecerá — clique no nome desejado para inserir a menção.',
      },
      {
        question: 'Posso editar ou excluir uma publicação?',
        answer:
          'Sim. Nas suas próprias publicações, ícones de editar (lápis) e excluir (lixeira) aparecem no canto superior direito do post. Administradores podem editar/excluir qualquer publicação.',
      },
    ],
  },
  {
    title: 'NR-01 (Riscos Psicossociais)',
    icon: '🛡️',
    items: [
      {
        question: 'O que é a NR-01?',
        answer:
          'A NR-01 é uma norma regulamentadora que exige a avaliação de riscos psicossociais no trabalho. A plataforma permite responder avaliações e acompanhar resultados para conformidade.',
      },
      {
        question: 'Como responder a avaliação NR-01?',
        answer:
          'Quando houver uma avaliação ativa, um banner aparecerá no Dashboard. Clique para responder — é um questionário com escala de 1 a 5 sobre aspectos do ambiente de trabalho.',
      },
    ],
  },
  {
    title: 'PDI (Plano de Desenvolvimento)',
    icon: '📈',
    items: [
      {
        question: 'O que é o PDI?',
        answer:
          'O Plano de Desenvolvimento Individual é uma ferramenta para definir ações de crescimento profissional com prazos e acompanhamento.',
      },
      {
        question: 'Como criar um plano?',
        answer:
          'Acesse "PDI" no menu, clique em "Novo Plano", defina as metas de desenvolvimento, prazos e ações. Atualize o status conforme avança.',
      },
    ],
  },
  {
    title: 'Gamificação',
    icon: '🏆',
    items: [
      {
        question: 'Como funciona a gamificação?',
        answer:
          'Você ganha pontos ao interagir com a plataforma: responder avaliações, dar feedback, completar OKRs, etc. Acompanhe seu ranking e conquistas na página "Gamificação".',
      },
    ],
  },
  {
    title: 'Dúvidas Gerais',
    icon: '❓',
    items: [
      {
        question: 'Posso trocar entre tema claro e escuro?',
        answer:
          'Sim! Clique no ícone de sol/lua no cabeçalho para alternar entre os temas.',
      },
      {
        question: 'Como recebo notificações?',
        answer:
          'O sino no cabeçalho mostra notificações em tempo real (novas avaliações, feedback recebido, comunicados). Clique para ver os detalhes.',
      },
      {
        question: 'Esqueci minha senha. O que faço?',
        answer:
          'Na tela de login, clique em "Esqueceu a senha?" e siga as instruções para redefinir via email.',
      },
    ],
  },
];

export default function AjudaPage() {
  const [openTopic, setOpenTopic] = useState<number | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Central de Ajuda</h1>
      <p className="text-gray-400 mb-6">Encontre respostas para as dúvidas mais comuns sobre a plataforma.</p>

      <div className="space-y-3">
        {topics.map((topic, topicIdx) => (
          <div key={topicIdx} className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenTopic(openTopic === topicIdx ? null : topicIdx)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-800/30 transition-colors text-left"
            >
              <span className="text-xl">{topic.icon}</span>
              <span className="flex-1 font-medium text-gray-100">{topic.title}</span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${openTopic === topicIdx ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openTopic === topicIdx && (
              <div className="border-t border-gray-700/20">
                {topic.items.map((item, itemIdx) => {
                  const itemKey = `${topicIdx}-${itemIdx}`;
                  return (
                    <div key={itemIdx} className="border-b border-gray-700/10 last:border-b-0">
                      <button
                        onClick={() => setOpenItem(openItem === itemKey ? null : itemKey)}
                        className="w-full flex items-center gap-2 px-5 py-3 hover:bg-gray-800/20 transition-colors text-left"
                      >
                        <svg
                          className={`w-4 h-4 text-emerald-400 flex-shrink-0 transition-transform ${openItem === itemKey ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-sm font-medium text-gray-200">{item.question}</span>
                      </button>
                      {openItem === itemKey && (
                        <div className="px-5 pb-3 pl-11">
                          <p className="text-sm text-gray-400 leading-relaxed">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
