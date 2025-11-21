(() => {
  // Elemento de input do telefone; se não existir, não faz nada
  const phone = document.getElementById('telefone-celular');
  if (!phone) return;

  // Helpers simples para trabalhar apenas com dígitos
  const onlyDigits = s => (s.match(/\d/g) || []).join('');
  const countDigits = s => (s.match(/\d/g) || []).length;

  // Formata uma string qualquer para (DD)PPPPP-PPPP usando apenas os dígitos
  const formatPhone = v => {
    const d = onlyDigits(v);
    const ddd = d.slice(0, 2);
    const p1 = d.slice(2, 7);
    const p2 = d.slice(7, 11);
    return '(' + ddd + ')' + (p1 || '') + (p2 ? '-' + p2 : '');
  };

  // Converte um índice de dígitos (quantos dígitos aparecem antes do cursor)
  // para a posição do cursor na string formatada.
  const caretPosFromDigitIndex = (formatted, idx) => {
    if (idx <= 0) return 1; // dentro dos parênteses
    let n = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i]) && ++n === idx) return i + 1;
    }
    return formatted.length;
  };

  // Guarda o valor anterior e posição do cursor antes da alteração
  let prevValue = '';
  let prevSel = 0;

  // keydown: registra estado anterior e impede que os parênteses sejam apagados
  phone.addEventListener('keydown', e => {
    prevValue = phone.value;
    prevSel = phone.selectionStart || 0;

    const selStart = prevSel;
    const selEnd = phone.selectionEnd || 0;

    // Backspace: não permite apagar o '(' e ajusta seleção se necessário
    if (e.key === 'Backspace') {
      if (selStart <= 1 && selEnd <= 1) return e.preventDefault();
      if (selStart < 1 && selEnd > 1) {
        e.preventDefault();
        phone.setSelectionRange(1, selEnd);
        return;
      }
    }
    // Delete no início também é bloqueado
    if (e.key === 'Delete' && selStart === 0) return e.preventDefault();
  });

  // input: aplica formatação e restaura o caret na posição correta
  phone.addEventListener('input', () => {
    const formatted = formatPhone(phone.value);

    // quantos dígitos haviam antes do cursor no valor anterior
    const prevDigitsBefore = countDigits(prevValue.slice(0, prevSel));
    // variação de dígitos entre valores (adição/remoção)
    const delta = countDigits(phone.value) - countDigits(prevValue);
    let target = prevDigitsBefore + Math.max(0, delta);

    phone.value = formatted;

    // se não havia valor anterior, posiciona no fim
    if (!prevValue) return phone.setSelectionRange(phone.value.length, phone.value.length);

    // limita para o total disponível e calcula posição final
    const total = countDigits(phone.value);
    if (target > total) target = total;
    const pos = caretPosFromDigitIndex(formatted, target);
    phone.setSelectionRange(pos, pos);
  });

  // focus: insere '()' se estiver vazio e coloca o caret entre parênteses
  phone.addEventListener('focus', () => {
    if (!phone.value.trim()) {
      phone.value = '()';
      phone.setSelectionRange(1, 1);
    } else if ((phone.selectionStart || 0) <= 1) {
      phone.setSelectionRange(1, 1);
    }
  });

  // click: garante que clicando na área do parênteses o caret vá para dentro
  phone.addEventListener('click', () => {
    if ((phone.selectionStart || 0) <= 1) phone.setSelectionRange(1, 1);
  });

  // blur: se não houver dígitos, limpa o campo
  phone.addEventListener('blur', () => {
    if (!onlyDigits(phone.value)) phone.value = '';
  });
})();
