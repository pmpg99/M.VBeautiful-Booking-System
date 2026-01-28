import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Política de Privacidade | M.VBeautiful</title>
        <meta name="description" content="Política de Privacidade da M.VBeautiful - Saiba como protegemos os seus dados pessoais." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold text-foreground mb-8">Política de Privacidade</h1>
          
          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-PT')}
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Responsável pelo Tratamento de Dados</h2>
              <p>
                A M.VBeautiful, propriedade de Marta Vilela, é responsável pelo tratamento dos dados pessoais 
                recolhidos através desta plataforma de marcações online.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. Dados Pessoais Recolhidos</h2>
              <p>Recolhemos os seguintes dados pessoais para gestão de marcações:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Nome completo</strong> - para identificação do cliente</li>
                <li><strong>Número de telefone</strong> - para contacto e confirmação de marcações</li>
                <li><strong>Email</strong> (opcional) - para envio de confirmações e lembretes</li>
                <li><strong>Histórico de marcações</strong> - para gestão de serviços</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. Finalidade do Tratamento</h2>
              <p>Os seus dados são utilizados exclusivamente para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Processamento e gestão de marcações de serviços</li>
                <li>Envio de confirmações de marcações</li>
                <li>Envio de lembretes 24 horas antes da marcação</li>
                <li>Notificações sobre alterações ou cancelamentos</li>
                <li>Comunicação relacionada com os serviços contratados</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Base Legal</h2>
              <p>
                O tratamento dos seus dados pessoais baseia-se na execução de um contrato de prestação 
                de serviços (marcação de tratamentos de estética e unhas) e no seu consentimento para 
                receber comunicações relacionadas.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Conservação dos Dados</h2>
              <p>
                Os seus dados pessoais são conservados durante o período necessário para a prestação 
                dos serviços e cumprimento de obrigações legais, sendo eliminados quando deixarem de 
                ser necessários para os fins para os quais foram recolhidos.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Partilha de Dados</h2>
              <p>
                Os seus dados pessoais não são partilhados com terceiros, exceto quando necessário 
                para a prestação dos serviços (ex: integração com calendário para gestão de agenda) 
                ou quando exigido por lei.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Segurança</h2>
              <p>
                Implementamos medidas técnicas e organizativas adequadas para proteger os seus dados 
                pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">8. Os Seus Direitos (RGPD)</h2>
              <p>Nos termos do Regulamento Geral sobre a Proteção de Dados, tem direito a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Acesso</strong> - solicitar informação sobre os dados que temos sobre si</li>
                <li><strong>Retificação</strong> - corrigir dados incorretos ou desatualizados</li>
                <li><strong>Apagamento</strong> - solicitar a eliminação dos seus dados</li>
                <li><strong>Portabilidade</strong> - receber os seus dados em formato estruturado</li>
                <li><strong>Oposição</strong> - opor-se ao tratamento dos seus dados</li>
                <li><strong>Limitação</strong> - restringir o tratamento dos seus dados</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">9. Contacto</h2>
              <p>
                Para exercer os seus direitos ou esclarecer dúvidas sobre privacidade, contacte-nos 
                através do Instagram <a href="https://www.instagram.com/m.vbeautiful" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@m.vbeautiful</a>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">10. Alterações à Política</h2>
              <p>
                Esta política pode ser atualizada periodicamente. Quaisquer alterações significativas 
                serão comunicadas através da plataforma.
              </p>
            </section>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicy;
