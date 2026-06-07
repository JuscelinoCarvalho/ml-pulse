import LegalLayout, { Section } from "./LegalLayout";

const CONTACT = "juscelino.carvalho@gmail.com";

export default function Privacy() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="07 de junho de 2026">
      <p>
        Esta Política de Privacidade descreve como o <strong>ML Pulse</strong>{" "}
        ("nós", "aplicação" ou "serviço") coleta, utiliza, armazena e protege as
        informações dos usuários que utilizam a ferramenta para análise de dados
        de suas contas do Mercado Livre. Ao utilizar o ML Pulse, você concorda
        com as práticas descritas neste documento.
      </p>

      <Section title="1. Dados que coletamos">
        <p>Para funcionar, o ML Pulse coleta e processa:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>E-mail de acesso:</strong> utilizado para autenticação por
            código de uso único (OTP), sem necessidade de senha.
          </li>
          <li>
            <strong>Tokens de acesso do Mercado Livre:</strong> obtidos via
            OAuth quando você conecta sua conta, usados exclusivamente para
            consultar dados da sua própria conta de vendedor.
          </li>
          <li>
            <strong>Dados de negócio do Mercado Livre:</strong> informações de
            anúncios, pedidos, vendas, reputação e notificações da sua conta,
            obtidas através da API oficial do Mercado Livre.
          </li>
        </ul>
      </Section>

      <Section title="2. Como utilizamos os dados">
        <p>
          Os dados são utilizados unicamente para fornecer as funcionalidades de
          análise do serviço: dashboards de vendas, pesquisa e análise de
          produtos, indicadores de reputação e recebimento de notificações
          (webhooks) do Mercado Livre. Não vendemos, alugamos nem compartilhamos
          seus dados com terceiros para fins de marketing.
        </p>
      </Section>

      <Section title="3. Armazenamento e segurança">
        <p>
          Os tokens de acesso do Mercado Livre são armazenados de forma{" "}
          <strong>criptografada</strong>. A autenticação utiliza tokens de sessão
          (JWT) com expiração. Os dados são hospedados em servidor próprio com
          acesso restrito. Adotamos medidas técnicas razoáveis para proteger as
          informações contra acesso não autorizado, perda ou alteração.
        </p>
      </Section>

      <Section title="4. Compartilhamento com o Mercado Livre">
        <p>
          O ML Pulse se comunica com a API oficial do Mercado Livre para obter os
          dados da sua conta. O uso dos dados obtidos por meio dessa API segue
          também os Termos e Políticas de Privacidade do próprio Mercado Livre.
        </p>
      </Section>

      <Section title="5. Retenção e exclusão">
        <p>
          Os dados são mantidos enquanto sua conta estiver ativa no serviço. Você
          pode solicitar a desconexão da sua conta do Mercado Livre a qualquer
          momento, o que revoga os tokens armazenados, bem como solicitar a
          exclusão dos seus dados entrando em contato conosco.
        </p>
      </Section>

      <Section title="6. Seus direitos (LGPD)">
        <p>
          Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você
          tem direito a acessar, corrigir, portar e excluir seus dados pessoais,
          além de revogar consentimentos. Para exercer esses direitos, entre em
          contato pelo e-mail abaixo.
        </p>
      </Section>

      <Section title="7. Alterações nesta política">
        <p>
          Esta política pode ser atualizada periodicamente. A data da última
          atualização é sempre indicada no topo deste documento.
        </p>
      </Section>

      <Section title="8. Contato">
        <p>
          Em caso de dúvidas sobre esta Política de Privacidade ou sobre o
          tratamento dos seus dados, entre em contato pelo e-mail{" "}
          <a href={`mailto:${CONTACT}`} className="text-ml-blue underline">
            {CONTACT}
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}
