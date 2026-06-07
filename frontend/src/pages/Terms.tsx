import LegalLayout, { Section } from "./LegalLayout";

const CONTACT = "juscelino.carvalho@gmail.com";

export default function Terms() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="07 de junho de 2026">
      <p>
        Estes Termos de Uso regem a utilização do <strong>ML Pulse</strong>{" "}
        ("serviço" ou "aplicação"), uma ferramenta de análise de dados do
        Mercado Livre. Ao acessar ou utilizar o serviço, você declara que leu,
        compreendeu e concorda com estes termos.
      </p>

      <Section title="1. Descrição do serviço">
        <p>
          O ML Pulse oferece análise de produtos, dashboard de vendas,
          indicadores de reputação e recebimento de notificações da conta do
          usuário no Mercado Livre, por meio da integração com a API oficial via
          OAuth. O serviço é fornecido para apoiar a gestão e a tomada de decisão
          do vendedor.
        </p>
      </Section>

      <Section title="2. Aplicação independente">
        <p>
          O ML Pulse é uma aplicação <strong>independente</strong> e não possui
          vínculo, patrocínio ou afiliação oficial com o Mercado Livre. As marcas
          "Mercado Livre" e correlatas pertencem aos seus respectivos
          proprietários.
        </p>
      </Section>

      <Section title="3. Conta e acesso">
        <p>
          O acesso é feito por autenticação via código enviado ao e-mail (OTP).
          Você é responsável por manter a confidencialidade do seu acesso e por
          todas as atividades realizadas na sua conta. Para utilizar as
          funcionalidades de análise, é necessário conectar sua conta do Mercado
          Livre autorizando o acesso via OAuth.
        </p>
      </Section>

      <Section title="4. Uso adequado">
        <p>Ao utilizar o serviço, você concorda em não:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Utilizar o serviço para fins ilícitos ou não autorizados;</li>
          <li>
            Tentar acessar dados de contas de terceiros sem a devida
            autorização;
          </li>
          <li>
            Sobrecarregar, comprometer ou tentar burlar os mecanismos de
            segurança do serviço ou da API do Mercado Livre;
          </li>
          <li>
            Violar os Termos e Condições e as políticas do próprio Mercado Livre.
          </li>
        </ul>
      </Section>

      <Section title="5. Dados e privacidade">
        <p>
          O tratamento dos seus dados é descrito na nossa{" "}
          <a href="/privacy" className="text-ml-blue underline">
            Política de Privacidade
          </a>
          , que faz parte integrante destes Termos.
        </p>
      </Section>

      <Section title="6. Disponibilidade e isenção de garantias">
        <p>
          O serviço é fornecido "no estado em que se encontra", sem garantias de
          disponibilidade ininterrupta ou de exatidão dos dados, que dependem das
          informações fornecidas pela API do Mercado Livre. Podem ocorrer
          interrupções para manutenção ou por fatores externos.
        </p>
      </Section>

      <Section title="7. Limitação de responsabilidade">
        <p>
          Na máxima extensão permitida pela lei, o ML Pulse não se responsabiliza
          por decisões comerciais tomadas com base nas análises apresentadas, nem
          por perdas decorrentes de indisponibilidade, imprecisão de dados ou uso
          indevido do serviço.
        </p>
      </Section>

      <Section title="8. Alterações nos termos">
        <p>
          Estes Termos podem ser atualizados a qualquer momento. O uso continuado
          do serviço após alterações representa a sua concordância com a versão
          vigente, cuja data é indicada no topo deste documento.
        </p>
      </Section>

      <Section title="9. Contato">
        <p>
          Dúvidas sobre estes Termos de Uso podem ser enviadas para o e-mail{" "}
          <a href={`mailto:${CONTACT}`} className="text-ml-blue underline">
            {CONTACT}
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}
