import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <>
      <Helmet>
        <title>Termos de Serviço | M.VBeautiful</title>
        <meta name="description" content="Termos de Serviço da M.VBeautiful - Condições de utilização da plataforma de marcações." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold text-foreground mb-8">Termos de Serviço</h1>
          
          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-PT')}
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Identificação</h2>
              <p>
                Estes Termos de Serviço regulam a utilização da plataforma de marcações online 
                da M.VBeautiful, propriedade de Marta Vilela, especializada em serviços de estética, 
                unhas, maquilhagem e pestanas.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. Serviços Disponíveis</h2>
              <p>A M.VBeautiful oferece os seguintes serviços através desta plataforma:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Unhas de Gel (manutenção e aplicação)</li>
                <li>Epilação a Linha (Threading)</li>
                <li>Maquilhagem</li>
                <li>Depilação a Laser (para mulher e homem)</li>
                <li>Extensões de Pestanas (por Joana Lindinho)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. Marcações</h2>
              <h3 className="text-lg font-medium text-foreground">3.1 Como Marcar</h3>
              <p>
                As marcações são efetuadas através desta plataforma, selecionando o serviço pretendido, 
                data e hora disponíveis, e fornecendo os dados de contacto necessários.
              </p>
              
              <h3 className="text-lg font-medium text-foreground">3.2 Confirmação</h3>
              <p>
                Após a marcação, receberá uma confirmação por email (se fornecido) e/ou notificação 
                na área de cliente. Um lembrete será enviado 24 horas antes da marcação.
              </p>
              
              <h3 className="text-lg font-medium text-foreground">3.3 Horário de Funcionamento</h3>
              <p>
                O horário regular de funcionamento é das 10h às 18h30. Os serviços de Depilação a Laser 
                têm horário especial: último fim de semana de cada mês, das 9h às 19h.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Política de Cancelamento</h2>
              <h3 className="text-lg font-medium text-foreground">4.1 Cancelamento pelo Cliente</h3>
              <p>
                Se necessitar cancelar uma marcação, agradecemos que o faça com a maior antecedência 
                possível, preferencialmente com 24 horas de antecedência, para permitir que outros 
                clientes possam utilizar o horário.
              </p>
              
              <h3 className="text-lg font-medium text-foreground">4.2 Cancelamento pela M.VBeautiful</h3>
              <p>
                Em casos excecionais, poderemos ter de cancelar ou remarcar a sua marcação. Nestes casos, 
                será notificado(a) com a maior brevidade possível através dos contactos fornecidos.
              </p>
              
              <h3 className="text-lg font-medium text-foreground">4.3 Não Comparência</h3>
              <p>
                A não comparência sem aviso prévio pode limitar futuras marcações. Valorizamos 
                a pontualidade e o respeito pelo tempo de todos.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Preços e Pagamentos</h2>
              <p>
                Os preços dos serviços estão indicados na plataforma no momento da marcação. 
                O pagamento é efetuado presencialmente após a realização do serviço, salvo 
                indicação em contrário.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Responsabilidades do Cliente</h2>
              <p>Ao utilizar esta plataforma, compromete-se a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Comparecer pontualmente às marcações</li>
                <li>Informar sobre condições de saúde relevantes para os tratamentos</li>
                <li>Respeitar as regras do estabelecimento</li>
                <li>Cancelar marcações com antecedência adequada</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Responsabilidades da M.VBeautiful</h2>
              <p>Comprometemo-nos a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Prestar serviços de qualidade</li>
                <li>Respeitar os horários marcados</li>
                <li>Utilizar materiais e técnicas adequados</li>
                <li>Proteger os seus dados pessoais</li>
                <li>Informar sobre quaisquer alterações às marcações</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">8. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo desta plataforma, incluindo textos, imagens, logótipos e design, 
                é propriedade da M.VBeautiful e está protegido por direitos de autor.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">9. Alterações aos Termos</h2>
              <p>
                A M.VBeautiful reserva-se o direito de alterar estes Termos de Serviço a qualquer 
                momento. As alterações entram em vigor após publicação nesta página.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">10. Lei Aplicável</h2>
              <p>
                Estes Termos de Serviço são regidos pela lei portuguesa. Quaisquer litígios 
                serão submetidos aos tribunais competentes em Portugal.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">11. Contacto</h2>
              <p>
                Para questões sobre estes Termos de Serviço, contacte-nos através do Instagram{" "}
                <a href="https://www.instagram.com/m.vbeautiful" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@m.vbeautiful</a>.
              </p>
            </section>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default TermsOfService;
