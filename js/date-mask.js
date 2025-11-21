// Máscara simples para campo de data no formato DD/MM/AAAA
// Comportamento:
// - insere barras automaticamente enquanto o usuário digita
// - valida mês (01-12) e dia (respeitando dias do mês e anos bissextos)
// - mantém posição do caret/seleção de forma básica
// - suporta inputs nativos `type="date"`: ao focar o campo, o script
//   muda temporariamente para `type="text"` para permitir a máscara;
//   ao blur o valor é convertido para ISO (YYYY-MM-DD) e `type` retorna a `date`.

(() => {
  // Seleciona inputs que declaram a máscara via atributo, via classe ou inputs nativos type=date
  const inputs = document.querySelectorAll('input[type="date"], input[data-mask="date"], input.date-mask');
  if (!inputs || inputs.length === 0) return;

  const onlyDigits = s => (s.match(/\d/g) || []).join('');
  const countDigits = s => (s.match(/\d/g) || []).length;

  // Gera saída DD/MM/YYYY a partir de uma sequência de dígitos
  const formatDate = v => {
    const d = onlyDigits(v);
    const day = d.slice(0, 2);
    const month = d.slice(2, 4);
    const year = d.slice(4, 8);
    let out = '' + (day || '');
    if (month) out += '/' + month;
    if (year) out += '/' + year;
    return out;
  };

  const caretPosFromDigitIndex = (formatted, idx) => {
    if (idx <= 0) return 0;
    let n = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i]) && ++n === idx) return i + 1;
    }
    return formatted.length;
  };

  inputs.forEach(input => {
    let prevValue = '';
    let prevSel = 0;
    const wasNativeDate = input.type === 'date';
    // armazenará o valor ISO (YYYY-MM-DD) quando tivermos uma data completa
    // útil porque alguns navegadores manipulam o `value` quando trocam o `type`
    let storedIso = '';

    // Registrar estado antes da alteração (ajuda a restaurar caret)
    // e tratar Backspace/Delete para não remover as barras
    input.addEventListener('keydown', (e) => {
      prevValue = input.value;
      prevSel = input.selectionStart || 0;

      const selStart = prevSel;
      const selEnd = input.selectionEnd || 0;
      const fmt = input.value || '';

      if (e.key === 'Backspace') {
        // se cursor está logo após uma barra, mover cursor para antes da barra
        if (selStart === selEnd) {
          if (fmt.charAt(selStart - 1) === '/') {
            e.preventDefault();
            input.setSelectionRange(selStart - 1, selStart - 1);
            return;
          }
        } else {
          // seleção inclui barras: restringir seleção para não incluir barras
          const selText = fmt.slice(selStart, selEnd);
          if (selText.includes('/')) {
            e.preventDefault();
            // move início para primeiro char != '/'
            let ns = selStart;
            while (ns < selEnd && fmt.charAt(ns) === '/') ns++;
            input.setSelectionRange(ns, selEnd);
            return;
          }
        }
      }

      if (e.key === 'Delete') {
        if (selStart === selEnd) {
          if (fmt.charAt(selStart) === '/') {
            e.preventDefault();
            input.setSelectionRange(selStart + 1, selStart + 1);
            return;
          }
        } else {
          const selText = fmt.slice(selStart, selEnd);
          if (selText.includes('/')) {
            e.preventDefault();
            let ne = selEnd;
            while (ne > selStart && fmt.charAt(ne - 1) === '/') ne--;
            input.setSelectionRange(selStart, ne);
            return;
          }
        }
      }
    });

    // Ao digitar: validar mês/dia, formatar e manter caret
    input.addEventListener('input', () => {
      let digits = onlyDigits(input.value);

      // Valida mês: quando existir 2 dígitos de mês, não permite > 12
      if (digits.length >= 3) {
        const monthDigits = digits.slice(2, 4);
        if (monthDigits.length === 2) {
          const m = parseInt(monthDigits, 10);
          if (m < 1 || m > 12) {
            // rejeita último dígito inválido
            digits = digits.slice(0, digits.length - 1);
          }
        }
      }

      // Valida dia com base no mês/ano (se disponíveis)
      if (digits.length >= 2) {
        const dayDigits = digits.slice(0, 2);
        const monthDigits = digits.slice(2, 4);
        const yearDigits = digits.slice(4, 8);
        if (dayDigits.length === 2) {
          const day = parseInt(dayDigits, 10);
          const month = parseInt(monthDigits || '0', 10) || 0;
          const year = parseInt(yearDigits || '2000', 10) || 2000;
          const maxDay = month >= 1 && month <= 12 ? new Date(year, month, 0).getDate() : 31;
          if (day < 1 || day > maxDay) {
            // rejeita último dígito do dia inválido
            digits = digits.slice(0, digits.length - 1);
          }
        }
      }

      const formatted = formatDate(digits);

      const prevDigitsBefore = countDigits(prevValue.slice(0, prevSel));
      const delta = countDigits(digits) - countDigits(prevValue);
      let target = prevDigitsBefore + Math.max(0, delta);

      input.value = formatted;

      // Se o usuário apagou tudo, limpamos o ISO armazenado para que
      // ao re-focar o campo ele não reapareça automaticamente.
      if (!digits.length) {
        storedIso = '';
        try { delete input.dataset.isoValue; } catch (e) { /* ignore */ }
      }

      // posiciona caret
      const total = countDigits(input.value);
      if (target > total) target = total;
      const pos = caretPosFromDigitIndex(formatted, target);
      input.setSelectionRange(pos, pos);

      // sincroniza hidden date se existir (apenas um conforto extra)
      const hidden = document.getElementById('data-nascimento-hidden');
      if (hidden) {
        const d = onlyDigits(input.value);
        if (d.length >= 8) {
          const day = d.slice(0, 2);
          const month = d.slice(2, 4);
          const year = d.slice(4, 8);
          hidden.value = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          hidden.value = '';
        }
      }
    });

    // Focus / blur: suporte para inputs nativos type=date
    if (wasNativeDate) {
      input.addEventListener('focus', () => {
        // Ao focar: primeiro tentamos mudar `type` para 'text' para que seja
        // seguro atribuir o valor no formato DD/MM/YYYY (evita erro em type=date).
        try { input.type = 'text'; } catch (e) { /* ignore */ }

        // Agora preenchemos a máscara a partir do ISO armazenado (se houver)
        const isoSource = storedIso || input.value || '';
        if (isoSource) {
          const parts = isoSource.split('-');
          if (parts.length === 3) input.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        // posiciona caret no fim para continuar edição naturalmente
        try { const pos = (input.value || '').length; input.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
      });

      input.addEventListener('blur', () => {
        // Ao sair do campo: se o usuário informou uma data completa e válida,
        // converte para ISO e restaura `type='date'`. Se estiver incompleto ou inválido,
        // NÃO apagar o valor — manter a máscara visível como `type='text'` para
        // que o usuário possa voltar e continuar a edição.
        const d = onlyDigits(input.value);
        if (d.length >= 8) {
          const day = d.slice(0, 2);
          const month = d.slice(2, 4);
          const year = d.slice(4, 8);
          const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const dateObj = new Date(iso);
          if (!isNaN(dateObj)) {
            try {
              // guarda o iso validado para reutilizar no próximo focus
              storedIso = iso;
              input.dataset.isoValue = iso;
              input.type = 'date';
              input.value = iso; // atribui ISO aceito por type=date
            } catch (e) {
              // Se não for possível alterar o tipo, deixamos a máscara visível.
            }
            return;
          }
        }
        // Se incompleto ou inválido: apagar qualquer ISO previamente armazenado
        // — o usuário pode ter apagado a data intencionalmente e não queremos
        // reconstituí-la ao retornar ao campo.
        storedIso = '';
        try { delete input.dataset.isoValue; } catch (e) { /* ignore */ }
        // Mantemos `type='text'` e a máscara exibida para que o usuário possa voltar e continuar.
      });
    } else {
      // para inputs não nativos, manter comportamento de limpeza
      // focus: não limpar o valor quando o usuário voltar ao campo; apenas posiciona o caret
      input.addEventListener('focus', () => {
        const pos = (input.value || '').length;
        try { input.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
      });

      input.addEventListener('blur', () => {
        // Não limpar o valor aqui — permitir que o usuário volte ao campo
        // e continue a edição sem perder o que digitou.
      });
    }
  });
})();
