/**
 * Serviço de Citações e Frases Icônicas de Anime (Anime Quotes)
 * Suporta:
 * 1. Banco permanente de frases clássicas curadas em português
 * 2. AnimeChan API v3 para puxar frases dinâmicas baseadas nos animes da lista do usuário
 */

export interface AnimeQuote {
  quote: string;
  character: string;
  anime: string;
  sourceType?: 'user_anime' | 'curated';
}

// Banco de dados curado de frases marcantes de animes traduzidas para PT-BR
const CURATED_QUOTES: AnimeQuote[] = [
  {
    quote: "Se você não assumir riscos, não pode criar um futuro.",
    character: "Monkey D. Luffy",
    anime: "One Piece",
    sourceType: 'curated'
  },
  {
    quote: "O trabalho duro vence o talento quando o talento não trabalha duro.",
    character: "Rock Lee",
    anime: "Naruto",
    sourceType: 'curated'
  },
  {
    quote: "Aqueles que quebram as regras são lixo, mas aqueles que abandonam seus amigos são piores que lixo.",
    character: "Kakashi Hatake",
    anime: "Naruto Shippuden",
    sourceType: 'curated'
  },
  {
    quote: "Mesmo que eu morra, o tempo que passei com vocês não vai desaparecer.",
    character: "Frieren",
    anime: "Sousou no Frieren",
    sourceType: 'curated'
  },
  {
    quote: "Não viva com arrependimentos. Se algo for importante para você, proteja com tudo o que tem.",
    character: "Portgas D. Ace",
    anime: "One Piece",
    sourceType: 'curated'
  },
  {
    quote: "A dor de estar sozinho é algo que não se pode comparar com nada neste mundo.",
    character: "Naruto Uzumaki",
    anime: "Naruto",
    sourceType: 'curated'
  },
  {
    quote: "Se você tem tempo para pensar em um fim bonito, por que não vive lindamente até o fim?",
    character: "Sakata Gintoki",
    anime: "Gintama",
    sourceType: 'curated'
  },
  {
    quote: "Não importa o quão forte o oponente seja, nós nunca recuamos!",
    character: "Tanjiro Kamado",
    anime: "Demon Slayer (Kimetsu no Yaiba)",
    sourceType: 'curated'
  },
  {
    quote: "Você não pode mudar nada a menos que possa abrir mão de algo.",
    character: "Armin Arlert",
    anime: "Attack on Titan (Shingeki no Kyojin)",
    sourceType: 'curated'
  },
  {
    quote: "O medo não é ruim. Ele ensina o que é a fraqueza. E quando você conhece sua fraqueza, você pode se tornar mais forte.",
    character: "Gildarts Clive",
    anime: "Fairy Tail",
    sourceType: 'curated'
  },
  {
    quote: "Eu não sou um herói da justiça nem nada do tipo. Mas qualquer um que tente machucar meus amigos... não terá meu perdão!",
    character: "Son Goku",
    anime: "Dragon Ball Z",
    sourceType: 'curated'
  },
  {
    quote: "A vida não é sobre quantas vezes você cai, mas sobre quantas vezes você se levanta com um sorriso.",
    character: "All Might",
    anime: "My Hero Academia",
    sourceType: 'curated'
  },
  {
    quote: "Quando você desiste, é aí que o jogo realmente acaba.",
    character: "Mitsui Hisashi",
    anime: "Slam Dunk",
    sourceType: 'curated'
  },
  {
    quote: "A verdadeira força não reside em não chorar, mas em continuar em frente mesmo em meio às lágrimas.",
    character: "Edward Elric",
    anime: "Fullmetal Alchemist: Brotherhood",
    sourceType: 'curated'
  },
  {
    quote: "Não olhe para trás, o que importa agora é a estrada que você tem pela frente.",
    character: "Levi Ackerman",
    anime: "Attack on Titan",
    sourceType: 'curated'
  },
  {
    quote: "Mesmo nas noites mais escuras, a alvorada sempre chega para quem continua lutando.",
    character: "Rengoku Kyoujurou",
    anime: "Demon Slayer",
    sourceType: 'curated'
  },
  {
    quote: "Eu prefiro confiar e me arrepender do que duvidar e me arrepender.",
    character: "Kirito (Kazuto Kirigaya)",
    anime: "Sword Art Online",
    sourceType: 'curated'
  },
  {
    quote: "O mundo não é perfeito. Mas está lá para nós, fazendo o melhor que pode... é isso que o torna tão belo.",
    character: "Roy Mustang",
    anime: "Fullmetal Alchemist",
    sourceType: 'curated'
  },
  {
    quote: "Pessoas fortes protegem os outros. Pessoas verdadeiramente fortes protegem a si mesmas e aos outros ao mesmo tempo.",
    character: "Rimuru Tempest",
    anime: "Tensei Shitara Slime Datta Ken",
    sourceType: 'curated'
  }
];

/**
 * Retorna a frase do dia (baseada no dia do ano para ser consistente para todos os usuários)
 */
export function getDailyQuote(): AnimeQuote {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  const index = Math.abs(dayOfYear) % CURATED_QUOTES.length;
  return CURATED_QUOTES[index];
}

/**
 * Retorna uma frase aleatória do banco curado
 */
export function getRandomQuote(): AnimeQuote {
  const randomIndex = Math.floor(Math.random() * CURATED_QUOTES.length);
  return CURATED_QUOTES[randomIndex];
}

/**
 * Busca dinâmica no AnimeChan API v3 (mesclando com animes da lista do usuário)
 */
export async function fetchDynamicQuote(userAnimeTitles?: string[]): Promise<AnimeQuote> {
  // 50% de chance de usar anime do usuário se houver animes na lista
  if (userAnimeTitles && userAnimeTitles.length > 0 && Math.random() > 0.4) {
    const randomTitle = userAnimeTitles[Math.floor(Math.random() * userAnimeTitles.length)];
    try {
      const cleanTitle = randomTitle.split(/[:(-]/)[0].trim();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`https://animechan.xyz/api/random/anime?title=${encodeURIComponent(cleanTitle)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.quote && data.character) {
          return {
            quote: data.quote,
            character: data.character,
            anime: data.anime || cleanTitle,
            sourceType: 'user_anime',
          };
        }
      }
    } catch {
      // Continua para o fallback
    }
  }

  // Tenta puxar qualquer citação randômica da API pública
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://animechan.xyz/api/random', { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.quote && data.character) {
        return {
          quote: data.quote,
          character: data.character,
          anime: data.anime || 'Anime',
          sourceType: 'curated',
        };
      }
    }
  } catch {
    // Falha silenciosa para o banco offline curado
  }

  return getRandomQuote();
}
