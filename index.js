const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessário para ambientes como Render ou Heroku
  },
});

// Testar conexão com o banco de dados ao iniciar
pool.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.stack);
  } else {
    console.log('Conectado ao banco de dados com sucesso!');
  }
});

// Servir arquivos estáticos (CSS e JS)
app.use(express.static(path.join(__dirname)));

// Endpoint para listar produtos de uma pasta
app.get('/produtos/:pasta_id', async (req, res) => {
  const { pasta_id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM produtos WHERE pasta_id = $1', [pasta_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar produtos da pasta:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos da pasta' });
  }
});

// Endpoint para criar uma nova pasta
app.post('/criar-pasta', async (req, res) => {
  const { nome } = req.body;

  try {
    const result = await pool.query('INSERT INTO pastas (nome) VALUES ($1) RETURNING *', [nome]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    res.status(500).json({ error: 'Erro ao criar pasta' });
  }
});

// Endpoint para listar pastas do banco de dados
app.get('/listar-pastas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pastas');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar pastas no banco de dados:', error);
    res.status(500).json({ error: 'Erro ao buscar pastas no banco de dados' });
  }
});

// Endpoint para adicionar um produto a uma pasta
app.post('/produtos/:pasta_id', async (req, res) => {
  const { pasta_id } = req.params;
  const { codigo, quantidade } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO produtos (pasta_id, codigo, quantidade) VALUES ($1, $2, $3) RETURNING *',
      [pasta_id, codigo, quantidade]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    res.status(500).json({ error: 'Erro ao adicionar produto' });
  }
});

// Endpoint para editar um produto
app.post('/editar-produto/:pasta_id/:id', async (req, res) => {
  const { pasta_id, id } = req.params;
  const { quantidade } = req.body;

  try {
    const result = await pool.query(
      'UPDATE produtos SET quantidade = $1 WHERE pasta_id = $2 AND id = $3 RETURNING *',
      [quantidade, pasta_id, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Erro ao editar produto:', error);
    res.status(500).json({ error: 'Erro ao editar produto' });
  }
});

// Endpoint para remover um produto
app.delete('/remover-produto/:pasta_id/:id', async (req, res) => {
  const { pasta_id, id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM produtos WHERE pasta_id = $1 AND id = $2 RETURNING *',
      [pasta_id, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
    } else {
      res.status(200).json({ message: 'Produto removido com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao remover produto:', error);
    res.status(500).json({ error: 'Erro ao remover produto' });
  }
});

// Endpoint para apagar uma pasta
app.delete('/apagar-pasta/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM pastas WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Pasta não encontrada' });
    } else {
      res.status(200).json({ message: 'Pasta apagada com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao apagar pasta:', error);
    res.status(500).json({ error: 'Erro ao apagar pasta' });
  }
});

// Endpoint para baixar uma pasta como arquivo texto
app.get('/baixar/:pasta_id', async (req, res) => {
  const { pasta_id } = req.params;

  try {
    const pastaResult = await pool.query('SELECT nome FROM pastas WHERE id = $1', [pasta_id]);
    if (pastaResult.rowCount === 0) {
      return res.status(404).json({ error: 'Pasta não encontrada' });
    }
    const nomePasta = pastaResult.rows[0].nome;

    const produtosResult = await pool.query('SELECT codigo, quantidade FROM produtos WHERE pasta_id = $1', [pasta_id]);
    const produtos = produtosResult.rows;

    if (produtos.length === 0) {
      return res.status(404).json({ error: 'Nenhum produto encontrado nesta pasta' });
    }

    let conteudo = '';
    produtos.forEach((produto) => {
      conteudo += `${produto.codigo}, ${produto.quantidade}${os.EOL}`;
    });

    const caminhoArquivo = `${__dirname}/${nomePasta}.txt`;
    fs.writeFileSync(caminhoArquivo, conteudo);

    res.download(caminhoArquivo, `${nomePasta}.txt`, (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo:', err);
      }
      fs.unlinkSync(caminhoArquivo);
    });
  } catch (error) {
    console.error('Erro ao gerar arquivo:', error);
    res.status(500).json({ error: 'Erro ao gerar arquivo' });
  }
});

// Endpoint para testar a conexão
app.get('/test-connection', (req, res) => {
  res.json({ message: 'Conexão bem-sucedida!' });
});

// Servir o arquivo index.html para qualquer rota
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicialização do servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
