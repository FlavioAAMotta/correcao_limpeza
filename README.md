# Verificador de Limpeza de Dados

Esta é uma ferramenta para verificar a qualidade da limpeza de dados em datasets CSV.

## Funcionalidades

- Upload de arquivos CSV
- Verificação automática de problemas comuns:
  - Valores nulos
  - Duplicatas
  - Espaços extras em strings
  - Problemas de formatação numérica
  - Valores absurdos ou negativos
- Pontuação geral da limpeza
- Detalhamento dos problemas encontrados

## Como usar

1. Instale as dependências:
```bash
pip install -r requirements.txt
```

2. Execute a aplicação:
```bash
streamlit run app.py
```

3. Acesse a interface web que será aberta automaticamente no seu navegador

4. Faça upload do seu arquivo CSV e analise os resultados

## Interpretando os Resultados

- A pontuação vai de 0 a 100%
- Cores indicam a qualidade da limpeza:
  - Verde: Boa limpeza (>= 80%)
  - Amarelo: Necessita atenção (60-79%)
  - Vermelho: Problemas sérios (< 60%)
- A lista detalhada mostra exatamente onde estão os problemas