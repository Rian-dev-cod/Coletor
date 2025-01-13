document.addEventListener('DOMContentLoaded', () => {
  const criarPastaSection = document.getElementById('criar-pasta-section');
  const gerenciarPastaSection = document.getElementById('gerenciar-pasta-section');
  const produtosSection = document.getElementById('produtos-section');
  const editarProdutoSection = document.getElementById('editar-produto-section');
  const criarPastaBtn = document.getElementById('criar-pasta-btn');
  const gerenciarPastaBtn = document.getElementById('gerenciar-pasta-btn');
  const criarPastaForm = document.getElementById('criar-pasta-form');
  const listaPastas = document.getElementById('lista-pastas');
  const nomePastaSelecionada = document.getElementById('nome-pasta-selecionada');
  const listaProdutos = document.getElementById('lista-produtos');
  const adicionarProdutoForm = document.getElementById('adicionar-produto-form');
  const editarProdutoForm = document.getElementById('editar-produto-form');
  const novoCodigo = document.getElementById('novo-codigo');
  const novaQuantidade = document.getElementById('nova-quantidade');

  let pastaAtual = '';

  // Alternar seções
  criarPastaBtn.addEventListener('click', () => {
    criarPastaSection.classList.remove('hidden');
    gerenciarPastaSection.classList.add('hidden');
    produtosSection.classList.add('hidden');
    editarProdutoSection.classList.add('hidden');
  });

  gerenciarPastaBtn.addEventListener('click', async () => {
    criarPastaSection.classList.add('hidden');
    gerenciarPastaSection.classList.remove('hidden');
    produtosSection.classList.add('hidden');
    editarProdutoSection.classList.add('hidden');

    try {
      const response = await fetch('/listar-pastas');
      if (!response.ok) throw new Error('Erro ao listar pastas.');

      const pastas = await response.json();
      listaPastas.innerHTML = '';
      pastas.forEach((pasta) => {
        const li = document.createElement('li');
        li.innerHTML = `
          ${pasta.nome} 
          <button onclick="abrirPasta('${pasta.id}')">Gerenciar</button>
          <button onclick="apagarPasta('${pasta.id}')">Apagar</button>
          <button onclick="baixarPasta('${pasta.id}')">Baixar</button>
        `;
        listaPastas.appendChild(li);
      });
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar pastas.');
    }
  });

  // Criar pasta
  criarPastaForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome-pasta').value;

    try {
      const response = await fetch('/criar-pasta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });

      if (response.ok) {
        criarPastaForm.reset();
        gerenciarPastaBtn.click();
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao criar pasta.');
    }
  });

  // Abrir pasta para gerenciar produtos
  window.abrirPasta = async (pastaId) => {
    pastaAtual = pastaId;
    produtosSection.classList.remove('hidden');
    editarProdutoSection.classList.add('hidden');
    nomePastaSelecionada.textContent = `Pasta ID: ${pastaId}`;

    try {
      const response = await fetch(`/produtos/${pastaId}`);
      if (!response.ok) throw new Error('Erro ao buscar produtos da pasta.');

      const produtos = await response.json();
      listaProdutos.innerHTML = '';
      produtos.forEach((prod) => {
        const li = document.createElement('li');
        li.innerHTML = `
          Código: ${prod.codigo}, Quantidade: ${prod.quantidade}
          <button onclick="editarProduto('${prod.id}', '${prod.codigo}', '${prod.quantidade}')">Editar</button>
          <button onclick="removerProduto('${pastaId}', '${prod.id}')">Remover</button>
        `;
        listaProdutos.appendChild(li);
      });
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar produtos.');
    }
  };

  // Adicionar produto
  adicionarProdutoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const codigo = document.getElementById('codigo-produto').value;
    const quantidade = document.getElementById('quantidade-produto').value;

    try {
      const response = await fetch(`/produtos/${pastaAtual}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, quantidade }),
      });

      if (response.ok) {
        adicionarProdutoForm.reset();
        abrirPasta(pastaAtual);
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao adicionar produto.');
    }
  });

  // Editar produto
  window.editarProduto = (id, codigo, quantidade) => {
    produtosSection.classList.add('hidden');
    editarProdutoSection.classList.remove('hidden');
    novoCodigo.value = codigo;
    novaQuantidade.value = quantidade;
    editarProdutoForm.dataset.produtoId = id; // Armazena o ID do produto no formulário
  };

  editarProdutoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const produtoId = editarProdutoForm.dataset.produtoId;

    try {
      const response = await fetch(`/editar-produto/${pastaAtual}/${produtoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantidade: novaQuantidade.value,
        }),
      });

      if (response.ok) {
        editarProdutoSection.classList.add('hidden');
        abrirPasta(pastaAtual);
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao editar produto.');
    }
  });

  // Remover produto
  window.removerProduto = async (pastaId, id) => {
    try {
      const response = await fetch(`/remover-produto/${pastaId}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          alert(error.message);
        } else {
          alert('Erro inesperado no servidor.');
        }
      } else {
        abrirPasta(pastaId);
      }
    } catch (error) {
      console.error('Erro ao remover produto:', error);
      alert('Erro ao remover produto.');
    }
  };

  // Apagar pasta
  window.apagarPasta = async (pastaId) => {
    if (confirm(`Deseja apagar a pasta "${pastaId}"?`)) {
      try {
        const response = await fetch(`/apagar-pasta/${pastaId}`, { method: 'DELETE' });

        if (response.ok) {
          gerenciarPastaBtn.click();
        } else {
          const error = await response.json();
          alert(error.message);
        }
      } catch (error) {
        console.error(error);
        alert('Erro ao apagar a pasta.');
      }
    }
  };

  // Baixar pasta
  window.baixarPasta = (pastaId) => {
    window.location.href = `/baixar/${pastaId}`;
  };
});
