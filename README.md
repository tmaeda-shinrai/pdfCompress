# 🗜️ Compressor de PDF Web

Ferramenta web rápida e segura para comprimir arquivos PDF diretamente no navegador.

## Funcionalidades

- **Upload múltiplo**: Adicione quantos arquivos PDF quiser, sem limite.
- **Compressão agressiva**: Ideal para PDFs de texto (1 a 3 páginas), reduzindo para 80-200 KB por arquivo.
- **Divisão em páginas**: Divida PDFs de múltiplas páginas em arquivos individuais por página.
- **Preserva nomes**: Os arquivos mantêm seus nomes originais após processamento.
- **Download em ZIP**: Todos os PDFs comprimidos são baixados juntos em um arquivo ZIP.
- **Processamento local**: Nenhum arquivo é enviado para servidores externos, garantindo privacidade total.
- **Botão Limpar**: Remove todos os arquivos enviados rapidamente.
- **Interface moderna**: Layout responsivo e intuitivo.
- **Favicon personalizado**: Emoji 🗜️ como ícone da aba.

## Como usar

1. Abra o arquivo `index.html` em um navegador moderno (Chrome, Edge, Firefox).
2. Arraste e solte seus arquivos PDF ou clique para selecionar.
3. Escolha a ação desejada: "Comprimir e Baixar ZIP" ou "Dividir em Páginas e Baixar ZIP".
4. Após o download, a sessão é limpa automaticamente.

## Observações
- Compressão é mais eficiente para PDFs de texto simples.
- PDFs com imagens podem não atingir o mesmo nível de redução.
- Recomenda-se até 3 páginas por arquivo para melhor resultado.

## Tecnologias utilizadas
- [pdf-lib](https://pdf-lib.js.org/) - Manipulação e criação de PDFs
- [pdf.js](https://mozilla.github.io/pdf.js/) - Renderização de páginas PDF
- [JSZip](https://stuk.github.io/jszip/) - Criação de arquivos ZIP
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - Download de arquivos

## Licença
Este projeto é livre para uso pessoal e comercial.


