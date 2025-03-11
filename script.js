// Lista de produtos conhecidos para verificar erros de digitação
const produtosConhecidos = [
    'Café', 'Pão de Forma', 'Refrigerante', 'Açúcar', 'Papel Toalha',
    'Macarrão', 'Farinha de Trigo', 'Manteiga', 'Pasta de Dente',
    'Queijo Mussarela', 'Desinfetante', 'Água Mineral', 'Molho de Tomate',
    'Sal', 'Presunto', 'Sabonete', 'Suco de Laranja', 'Papel Higiênico',
    'Amaciante', 'Condicionador', 'Detergente', 'Vinho', 'Feijão',
    'Biscoito Recheado', 'Cerveja', 'Shampoo', 'Óleo de Soja',
    'Leite Integral', 'Sabão em Pó', 'Arroz', 'Carvão'
];

// Configuração do drag and drop
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropZone.classList.add('dragover');
}

function unhighlight() {
    dropZone.classList.remove('dragover');
}

dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFileSelect, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
}

function showSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'spinner-container';
    spinner.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(spinner);
}

function hideSpinner() {
    const spinner = document.querySelector('.spinner-container');
    if (spinner) {
        spinner.remove();
    }
}

function handleFile(file) {
    if (file.type !== 'text/csv') {
        alert('Por favor, selecione um arquivo CSV válido.');
        return;
    }

    showSpinner();

    Papa.parse(file, {
        complete: function(results) {
            analisarDados(results.data);
            hideSpinner();
        },
        error: function(error) {
            hideSpinner();
            alert('Erro ao processar o arquivo: ' + error.message);
        },
        header: true
    });
}

function analisarDados(data) {
    const problemas = {
        valores_nulos: {},
        duplicatas: 0,
        espacos_extras: {},
        formatacao_numerica: {},
        valores_absurdos: {},
        produtos_problematicos: [],
        ceps_invalidos: []
    };

    // Verificar valores nulos
    const colunas = Object.keys(data[0]);
    colunas.forEach(coluna => {
        const nulos = data.filter(row => !row[coluna] || row[coluna].trim() === '').length;
        if (nulos > 0) {
            problemas.valores_nulos[coluna] = nulos;
        }
    });

    // Verificar duplicatas
    const linhasUnicas = new Set(data.map(JSON.stringify));
    problemas.duplicatas = data.length - linhasUnicas.size;

    // Verificar espaços extras
    ['cliente', 'produto', 'vendedor', 'status'].forEach(campo => {
        if (campo in data[0]) {
            const comEspacos = data.filter(row => 
                row[campo] && row[campo].trim() !== row[campo]
            ).length;
            if (comEspacos > 0) {
                problemas.espacos_extras[campo] = comEspacos;
            }
        }
    });

    // Verificar produtos problemáticos
    data.forEach(row => {
        if (row.produto) {
            const produto = row.produto.trim();
            if (produto.includes('#$@!') || 
                !produtosConhecidos.some(p => 
                    produto.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') === 
                    p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
                )) {
                if (!problemas.produtos_problematicos.includes(produto)) {
                    problemas.produtos_problematicos.push(produto);
                }
            }
        }
    });

    // Verificar CEPs
    data.forEach(row => {
        if (row.cep) {
            const cep = row.cep.trim();
            if (!/^\d{5}-?\d{3}$/.test(cep)) {
                if (!problemas.ceps_invalidos.includes(cep)) {
                    problemas.ceps_invalidos.push(cep);
                }
            }
        }
    });

    // Verificar valores numéricos
    data.forEach(row => {
        if (row.valor) {
            const valor = row.valor.toString();
            if (valor.includes(',')) {
                problemas.formatacao_numerica.valor = 
                    (problemas.formatacao_numerica.valor || 0) + 1;
            }
        }
        if (row.frete) {
            const frete = parseFloat(row.frete);
            if (frete < 0) {
                problemas.valores_absurdos.frete_negativo = 
                    (problemas.valores_absurdos.frete_negativo || 0) + 1;
            }
            if (frete > 1000) {
                problemas.valores_absurdos.frete_alto = 
                    (problemas.valores_absurdos.frete_alto || 0) + 1;
            }
        }
    });

    exibirResultados(problemas, data.length);
}

function exibirResultados(problemas, totalRegistros) {
    const resultsDiv = document.getElementById('results');
    const scoreValue = document.getElementById('scoreValue');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const problemsList = document.getElementById('problemsList');

    // Valores máximos esperados (pior caso) - ajustados para serem mais rigorosos
    const maximosEsperados = {
        valores_nulos: {
            total: 15000,  // Reduzido para ser mais rigoroso
            colunas: 17    // Mantido igual pois é o número real de colunas
        },
        duplicatas: 5000,  // Ajustado
        espacos_extras: {
            total: 11000   // Ajustado
        },
        formatacao_numerica: {
            total: 350000  // Ajustado
        },
        valores_absurdos: {
            frete_negativo: 3500,
            frete_alto: 1700
        },
        produtos_problematicos: 65,  // Ajustado
        ceps_invalidos: 55          // Ajustado
    };

    // Calcular pontuação com pesos ajustados
    let pontuacao = 100;
    
    // Valores nulos (35% do total)
    const totalNulos = Object.values(problemas.valores_nulos).reduce((a, b) => a + b, 0);
    const colunasComNulos = Object.keys(problemas.valores_nulos).length;
    pontuacao -= (totalNulos / maximosEsperados.valores_nulos.total) * 25;  // Aumentado
    pontuacao -= (colunasComNulos / maximosEsperados.valores_nulos.colunas) * 10;

    // Duplicatas (15%)
    pontuacao -= (problemas.duplicatas / maximosEsperados.duplicatas) * 15;

    // Espaços extras (10%)
    const totalEspacos = Object.values(problemas.espacos_extras).reduce((a, b) => a + b, 0);
    pontuacao -= (totalEspacos / maximosEsperados.espacos_extras.total) * 10;

    // Formatação numérica (15%)
    const totalFormatacao = Object.values(problemas.formatacao_numerica).reduce((a, b) => a + b, 0);
    pontuacao -= (totalFormatacao / maximosEsperados.formatacao_numerica.total) * 15;

    // Valores absurdos (15% total)
    const freteNegativo = problemas.valores_absurdos.frete_negativo || 0;
    const freteAlto = problemas.valores_absurdos.frete_alto || 0;
    pontuacao -= (freteNegativo / maximosEsperados.valores_absurdos.frete_negativo) * 7.5;
    pontuacao -= (freteAlto / maximosEsperados.valores_absurdos.frete_alto) * 7.5;

    // Produtos problemáticos (5%)
    pontuacao -= (problemas.produtos_problematicos.length / maximosEsperados.produtos_problematicos) * 5;

    // CEPs inválidos (5%)
    pontuacao -= (problemas.ceps_invalidos.length / maximosEsperados.ceps_invalidos) * 5;

    // Aplicar fator de correção adicional para casos extremos
    if (colunasComNulos >= 15 && totalNulos > 10000) {
        pontuacao *= 0.5; // Reduz pela metade se houver muitos problemas graves
    }

    pontuacao = Math.max(0, Math.min(100, pontuacao));

    // Atualizar pontuação
    scoreValue.textContent = pontuacao.toFixed(1);
    scoreDisplay.className = 'score ' + 
        (pontuacao >= 80 ? 'good' : pontuacao >= 60 ? 'warning' : 'bad');

    // Limpar lista de problemas anterior
    problemsList.innerHTML = '';

    // Mapeamento de nomes mais amigáveis para as categorias
    const nomesCategorias = {
        valores_nulos: 'Dados Faltantes',
        duplicatas: 'Registros Duplicados',
        espacos_extras: 'Problemas de Formatação (Espaços)',
        formatacao_numerica: 'Problemas de Formatação (Números)',
        valores_absurdos: 'Valores Inconsistentes',
        produtos_problematicos: 'Problemas de Padronização (Produtos)',
        ceps_invalidos: 'Problemas de Validação (CEP)'
    };

    // Criar um resumo dos problemas
    const problemasEncontrados = [];

    Object.entries(problemas).forEach(([categoria, quantidade]) => {
        let temProblema = false;

        if (typeof quantidade === 'object' && !Array.isArray(quantidade)) {
            temProblema = Object.keys(quantidade).length > 0;
        } else if (Array.isArray(quantidade)) {
            temProblema = quantidade.length > 0;
        } else {
            temProblema = quantidade > 0;
        }

        if (temProblema) {
            problemasEncontrados.push(nomesCategorias[categoria]);
        }
    });

    // Exibir resumo
    if (problemasEncontrados.length > 0) {
        const resumoDiv = document.createElement('div');
        resumoDiv.className = 'problem-item';
        
        const title = document.createElement('h4');
        title.textContent = 'Tipos de Problemas Encontrados';
        resumoDiv.appendChild(title);

        const lista = document.createElement('ul');
        lista.style.marginTop = '1rem';
        problemasEncontrados.forEach(problema => {
            const item = document.createElement('li');
            item.textContent = problema;
            item.style.marginBottom = '0.5rem';
            lista.appendChild(item);
        });
        resumoDiv.appendChild(lista);

        const dica = document.createElement('p');
        dica.className = 'mt-3 text-muted';
        dica.style.fontSize = '0.9rem';
        dica.innerHTML = 'Dica: Analise seu dataset para identificar onde estes problemas estão ocorrendo e como corrigi-los.';
        resumoDiv.appendChild(dica);

        problemsList.appendChild(resumoDiv);
    } else {
        const sucessoDiv = document.createElement('div');
        sucessoDiv.className = 'alert alert-success';
        sucessoDiv.textContent = 'Parabéns! Não foram encontrados problemas significativos no seu dataset.';
        problemsList.appendChild(sucessoDiv);
    }

    resultsDiv.classList.remove('d-none');
} 