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

function handleFile(file) {
    if (file.type !== 'text/csv') {
        alert('Por favor, selecione um arquivo CSV válido.');
        return;
    }

    Papa.parse(file, {
        complete: function(results) {
            analisarDados(results.data);
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

    // Calcular pontuação
    let pontuacao = 100;
    const penalidades = {
        valores_nulos: 2,
        duplicatas: 2,
        espacos_extras: 1,
        formatacao_numerica: 2,
        valores_absurdos: 3,
        produtos_problematicos: 2,
        ceps_invalidos: 2
    };

    // Aplicar penalidades
    Object.entries(problemas).forEach(([categoria, quantidade]) => {
        if (typeof quantidade === 'object') {
            const total = Object.values(quantidade).reduce((a, b) => a + b, 0);
            pontuacao -= (total / totalRegistros) * 100 * penalidades[categoria];
        } else if (Array.isArray(quantidade)) {
            pontuacao -= (quantidade.length / totalRegistros) * 100 * penalidades[categoria];
        } else {
            pontuacao -= (quantidade / totalRegistros) * 100 * penalidades[categoria];
        }
    });

    pontuacao = Math.max(0, Math.min(100, pontuacao));

    // Atualizar pontuação
    scoreValue.textContent = pontuacao.toFixed(1);
    scoreDisplay.className = 'score ' + 
        (pontuacao >= 80 ? 'good' : pontuacao >= 60 ? 'warning' : 'bad');

    // Limpar lista de problemas anterior
    problemsList.innerHTML = '';

    // Exibir problemas encontrados
    Object.entries(problemas).forEach(([categoria, quantidade]) => {
        if ((typeof quantidade === 'object' && Object.keys(quantidade).length > 0) ||
            (Array.isArray(quantidade) && quantidade.length > 0) ||
            (!isNaN(quantidade) && quantidade > 0)) {
            
            const problemDiv = document.createElement('div');
            problemDiv.className = 'problem-item';
            
            const title = document.createElement('h4');
            title.textContent = categoria.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            problemDiv.appendChild(title);

            const details = document.createElement('div');
            if (typeof quantidade === 'object' && !Array.isArray(quantidade)) {
                Object.entries(quantidade).forEach(([key, value]) => {
                    details.innerHTML += `<p>${key}: ${value} ocorrências</p>`;
                });
            } else if (Array.isArray(quantidade)) {
                details.innerHTML = `<p>Itens problemáticos encontrados: ${quantidade.length}</p>`;
                details.innerHTML += `<ul>${quantidade.map(item => `<li>${item}</li>`).join('')}</ul>`;
            } else {
                details.innerHTML = `<p>${quantidade} ocorrências</p>`;
            }
            problemDiv.appendChild(details);
            problemsList.appendChild(problemDiv);
        }
    });

    resultsDiv.classList.remove('d-none');
} 