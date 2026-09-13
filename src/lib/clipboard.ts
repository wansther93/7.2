/**
 * Utilitário seguro para cópia de texto para a área de transferência (Clipboard)
 * Funciona de forma resiliente em iframes, navegadores mobile e ambientes sem foco.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Tentar focar a janela atual para contornar o erro 'Document is not focused'
  try {
    if (typeof window !== 'undefined' && window.focus) {
      window.focus();
    }
  } catch {
    // Ignora se não puder focar
  }

  // 2. Tentar Clipboard API moderna se estiver com foco e disponível
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      if (document.hasFocus && document.hasFocus()) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Se não tiver certeza do foco, ainda tenta mas captura qualquer erro para acionar fallback
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API writeText falhou ou documento sem foco, tentando fallback execCommand:', err);
    }
  }

  // 3. Fallback ultra compatível usando textarea temporário + document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Evitar zoom no iOS e esconder elemento da tela mantendo selecionável
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0.01';
    textArea.style.zIndex = '-9999';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);

    // Seleção para iOS e Desktop
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      return true;
    }
  } catch (fallbackError) {
    console.error('Falha no fallback de cópia para o clipboard:', fallbackError);
  }

  return false;
}
