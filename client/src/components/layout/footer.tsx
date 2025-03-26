import { Link } from "wouter";
import { Gamepad2, Youtube, Headphones, MessageCircle, Send } from "lucide-react";
import { FaDiscord, FaWhatsapp, FaTelegram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <img 
                src="https://eternal-legend.com.br/eternal.jpg" 
                alt="Eternal Legend Logo" 
                className="h-8 w-8 rounded-full"
              />
              <span>Eternal Legend</span>
            </h3>
            <p className="text-gray-300 mb-4">
              Portal de Jogos para Cegos - Tornando jogos acessíveis para todos.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://www.youtube.com/c/eternallegend1" 
                className="text-gray-300 hover:text-white focus:outline-none focus:text-white" 
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Youtube className="h-5 w-5" aria-hidden="true" />
              </a>
              <a 
                href="https://bit.ly/31bORp8" 
                className="text-gray-300 hover:text-white focus:outline-none focus:text-white" 
                aria-label="Discord"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaDiscord className="h-5 w-5" aria-hidden="true" />
              </a>
              <a 
                href="https://chat.whatsapp.com/KMu7y4rKzXAH48EtJsonSs" 
                className="text-gray-300 hover:text-white focus:outline-none focus:text-white" 
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
              </a>
              <a 
                href="https://bit.ly/3loaRUT" 
                className="text-gray-300 hover:text-white focus:outline-none focus:text-white" 
                aria-label="Telegram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTelegram className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/games" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  Ver Jogos
                </Link>
              </li>
              <li>
                <Link href="/publish" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  Publicar Jogo
                </Link>
              </li>
              <li>
                <Link href="/auth" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  Entrar / Registrar
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Categorias</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/games?category=1" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  Aventura
                </Link>
              </li>
              <li>
                <Link href="/games?category=2" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  RPG
                </Link>
              </li>
              <li>
                <Link href="/games?category=3" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  Ação
                </Link>
              </li>
              <li>
                <Link href="/games?category=4" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  Puzzle
                </Link>
              </li>
              <li>
                <Link href="/games" className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
                  Ver todas
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Contato & Suporte</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://eternal-legend.com.br/sobre-o-nosso-aplicativo-e-o-nosso-site/" 
                  className="text-gray-300 hover:text-white focus:outline-none focus:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sobre Nós
                </a>
              </li>
              <li>
                <a 
                  href="https://eternal-legend.com.br/perguntas-frequentes/" 
                  className="text-gray-300 hover:text-white focus:outline-none focus:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a 
                  href="https://eternal-legend.com.br/nossos-contatos-e-redes-sociais/" 
                  className="text-gray-300 hover:text-white focus:outline-none focus:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contato
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700 text-sm text-gray-400 flex flex-col md:flex-row justify-between">
          <p>&copy; {new Date().getFullYear()} Eternal Legend. Todos os direitos reservados.</p>
          <div className="space-x-4 mt-4 md:mt-0">
            <a 
              href="mailto:filmesfxx@gmail.com" 
              className="hover:text-white focus:outline-none focus:text-white"
            >
              Contato: filmesfxx@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
