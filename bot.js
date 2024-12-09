const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json'); // Supondo que você tenha um arquivo config.json com as chaves
const axios = require('axios');
const express = require('express');

// Configuração do servidor HTTP para manter o bot ativo
const app = express();
app.get('/', (req, res) => {
  res.send('Bot está ativo e funcionando!');
});
app.listen(80, () => {
  console.log('Servidor rodando na porta 3000');
});

// Função para formatar o CNPJ
function formatCNPJ(cnpj) {
  return cnpj.replace(/[^\d]+/g, ''); // Remove caracteres não numéricos
}

// Função para consultar a empresa pelo CNPJ
async function consultarEmpresa(cnpj) {
  const formattedCNPJ = formatCNPJ(cnpj);
  try {
    const response = await axios.post('https://srwatson.co/api/company', {
      data: formattedCNPJ,
    });

    if (response.data.content) {
      const companyInfo = response.data;
      return companyInfo;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao consultar a empresa:', error);
    return null;
  }
}

// Função para consultar os sócios do CNPJ
async function consultarSocios(cnpj) {
  const formattedCNPJ = formatCNPJ(cnpj);

  try {
    const response = await axios.post('https://srwatson.co/api/partners', {
      data: formattedCNPJ,
    });

    if (response.data.results) {
      const socios = response.data.results
        .filter(socio => socio.edgeLabel === 'sócio')
        .map(socio => ({
          nome: socio.metadata['Nome do Sócio'],
          qualificação: socio.metadata['Qualificação do Sócio'],
          cpfCnpj: socio.metadata['CPF/CNPJ do Sócio'],
          dataEntrada: socio.metadata['Data de Entrada na Sociedade'],
        }));
      return socios;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Erro ao consultar os sócios:', error);
    return [];
  }
}

// Função para obter e formatar a resposta
async function obterInformacoes(cnpj) {
  const empresa = await consultarEmpresa(cnpj);
  const socios = await consultarSocios(cnpj);

  if (!empresa) {
    return 'Não foi possível encontrar as informações dessa empresa.';
  }

  let resposta = `**Informações da Empresa - CNPJ: ${cnpj}**\n`;
  resposta += `**Razão Social:** ${empresa.content}\n`;
  resposta += `**E-mail:** ${empresa.metadata['E-mail']}\n`;
  resposta += `**Telefone:** ${empresa.metadata['Telefone 1'] || 'Não disponível'}\n\n`;

  if (socios.length > 0) {
    resposta += '**Sócios da Empresa:**\n';
    socios.forEach(socio => {
      resposta += `- **${socio.nome}** (Qualificação: ${socio.qualificação}, CPF/CNPJ: ${socio.cpfCnpj})\n`;
    });
  } else {
    resposta += 'Não foram encontrados sócios para esta empresa.\n';
  }

  return resposta;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log('Bot está online!');
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('/cnpj')) {
    const cnpj = message.content.replace('/cnpj', '').trim();

    if (!cnpj) {
      message.reply('Por favor, forneça um CNPJ para consultar.').then((msg) => {
        setTimeout(() => msg.delete(), 10000); // Apaga a mensagem após 10 segundos
      });
      return;
    }

    const info = await obterInformacoes(cnpj);

    message.reply(info).then((msg) => {
      setTimeout(() => msg.delete(), 10000); // Apaga a mensagem após 10 segundos
    });
  }
});

client.login(token);
