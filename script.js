function obterElemento(id) {
    return document.getElementById(id);
}

function escrever(id, texto) {
    obterElemento(id).textContent = texto;
}

function eInteiro(valor) {
    return Number.isInteger(valor);
}

function numeroQuaseInteiro(valor, tolerancia = 1e-10) {
    return Math.abs(valor - Math.round(valor)) < tolerancia;
}

function normalizarNumero(valor) {
    if (!Number.isFinite(valor)) return valor;
    return numeroQuaseInteiro(valor) ? Math.round(valor) : valor;
}

function formatarNumero(valor, casas = 4) {
    if (!Number.isFinite(valor)) return String(valor);
    const normalizado = normalizarNumero(valor);
    if (eInteiro(normalizado)) return String(normalizado);
    return Number(normalizado).toFixed(casas);
}

function formatarValorCampo(valor) {
    const normalizado = normalizarNumero(valor);
    if (eInteiro(normalizado)) return String(normalizado);
    return Number(normalizado).toFixed(8).replace(/\.?0+$/, "");
}

/* =========================
   PARSER DE NÚMEROS E FRAÇÕES
========================= */
function fracaoDecimalSimples(texto) {
    const t = texto.trim().replace(",", ".");

    if (!/^[-+]?(?:\d+|\d*\.\d+)$/.test(t)) {
        return null;
    }

    const sinal = t.startsWith("-") ? -1 : 1;
    const limpo = t.replace(/^[-+]/, "");

    if (!limpo.includes(".")) {
        const inteiro = parseInt(limpo, 10);
        return {
            numerador: sinal * inteiro,
            denominador: 1
        };
    }

    const [parteInteira, parteDecimal] = limpo.split(".");
    const denominador = Math.pow(10, parteDecimal.length);
    const numeradorBase = parseInt((parteInteira || "0") + parteDecimal, 10);

    return {
        numerador: sinal * numeradorBase,
        denominador
    };
}

function mdcInteiro(a, b) {
    a = Math.abs(Math.trunc(a));
    b = Math.abs(Math.trunc(b));

    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }

    return a || 1;
}

function simplificarNumeradorDenominador(numerador, denominador) {
    if (denominador === 0) return null;

    if (denominador < 0) {
        numerador = -numerador;
        denominador = -denominador;
    }

    const divisor = mdcInteiro(numerador, denominador);

    return {
        numerador: numerador / divisor,
        denominador: denominador / divisor
    };
}

function analisarValorCampo(textoOriginal) {
    const texto = textoOriginal.trim().replace(/\s+/g, "").replace(",", ".");

    if (texto === "") {
        return { ok: false, erro: "Campo vazio." };
    }

    const partes = texto.split("/");

    if (partes.length > 2) {
        return { ok: false, erro: "A fração tem demasiadas barras." };
    }

    if (partes.length === 1) {
        const fracao = fracaoDecimalSimples(partes[0]);
        if (!fracao) {
            return { ok: false, erro: "Valor inválido." };
        }

        const simplificada = simplificarNumeradorDenominador(fracao.numerador, fracao.denominador);
        return {
            ok: true,
            valor: simplificada.numerador / simplificada.denominador,
            numerador: simplificada.numerador,
            denominador: simplificada.denominador
        };
    }

    const esquerda = fracaoDecimalSimples(partes[0]);
    const direita = fracaoDecimalSimples(partes[1]);

    if (!esquerda || !direita) {
        return { ok: false, erro: "Fração inválida." };
    }

    const numerador = esquerda.numerador * direita.denominador;
    const denominador = esquerda.denominador * direita.numerador;

    if (denominador === 0) {
        return { ok: false, erro: "Não é possível dividir por zero na fração." };
    }

    const simplificada = simplificarNumeradorDenominador(numerador, denominador);

    return {
        ok: true,
        valor: simplificada.numerador / simplificada.denominador,
        numerador: simplificada.numerador,
        denominador: simplificada.denominador
    };
}

function obterNumero(id) {
    const analise = analisarValorCampo(obterElemento(id).value);
    return analise.ok ? analise.valor : NaN;
}

/* =========================
   MÉDIA DE NOTAS
========================= */
let modoNotas = "media";
let escalaNotas = 100;

function selecionarModoNotas(modo) {
    modoNotas = modo;
    obterElemento("btnModoMedia").classList.toggle("toggle-active", modo === "media");
    obterElemento("btnModoPeso").classList.toggle("toggle-active", modo === "peso");
    obterElemento("rotuloResultadoNotas").textContent = modo === "media" ? "Média" : "Nota por pesos";
    obterElemento("somaPesosWrap").classList.toggle("hidden", modo !== "peso");
    gerarCamposNotas();
}

function selecionarEscalaNotas(escala) {
    escalaNotas = escala;
    obterElemento("btnEscala20").classList.toggle("toggle-active", escala === 20);
    obterElemento("btnEscala100").classList.toggle("toggle-active", escala === 100);
    gerarCamposNotas();
}

function gerarCamposNotas() {
    const quantidade = parseInt(obterElemento("quantidadeNotas").value);
    const container = obterElemento("camposNotas");
    const status = obterElemento("status");

    container.innerHTML = "";
    escrever("media", "—");
    status.className = "status vazio";
    status.textContent = "Aguardando cálculo";

    if (isNaN(quantidade) || quantidade < 2 || quantidade > 10) {
        container.innerHTML = '<p class="note">Introduza um número entre 2 e 10.</p>';
        atualizarSomaPesos();
        return;
    }

    for (let i = 1; i <= quantidade; i++) {
        const linha = document.createElement("div");
        linha.className = modoNotas === "peso" ? "notas-linha com-peso" : "notas-linha";

        const blocoNota = document.createElement("div");
        blocoNota.className = "nota-bloco";
        blocoNota.innerHTML = `
            <label for="nota${i}">Nota ${i}</label>
            <input type="number" id="nota${i}" min="0" max="${escalaNotas}" step="0.01" placeholder="0 a ${escalaNotas}">
        `;
        linha.appendChild(blocoNota);

        if (modoNotas === "peso") {
            const blocoPeso = document.createElement("div");
            blocoPeso.className = "nota-bloco";
            blocoPeso.innerHTML = `
                <label for="peso${i}">Peso ${i}</label>
                <input type="number" id="peso${i}" min="0" max="1" step="0.01" placeholder="0 a 1">
            `;
            linha.appendChild(blocoPeso);
        }

        container.appendChild(linha);
    }

    if (modoNotas === "peso") {
        const pesoPadrao = (1 / quantidade).toFixed(2);
        for (let i = 1; i <= quantidade; i++) {
            const campoPeso = obterElemento(`peso${i}`);
            if (campoPeso) campoPeso.value = pesoPadrao;
        }
    }

    adicionarEventosPesos();
    atualizarSomaPesos();
}

function adicionarEventosPesos() {
    const quantidade = parseInt(obterElemento("quantidadeNotas").value);
    if (modoNotas !== "peso" || isNaN(quantidade)) return;

    for (let i = 1; i <= quantidade; i++) {
        const campoPeso = obterElemento(`peso${i}`);
        if (campoPeso) {
            campoPeso.addEventListener("input", atualizarSomaPesos);
        }
    }
}

function atualizarSomaPesos() {
    const wrap = obterElemento("somaPesosWrap");
    const texto = obterElemento("somaPesosTexto");

    if (modoNotas !== "peso") {
        wrap.classList.add("hidden");
        texto.textContent = "0 / 1";
        wrap.className = "peso-sum hidden";
        return;
    }

    wrap.classList.remove("hidden");

    const quantidade = parseInt(obterElemento("quantidadeNotas").value);
    if (isNaN(quantidade) || quantidade < 2 || quantidade > 10) {
        texto.textContent = "0 / 1";
        wrap.className = "peso-sum";
        return;
    }

    let soma = 0;
    for (let i = 1; i <= quantidade; i++) {
        const campo = obterElemento(`peso${i}`);
        const valor = campo ? parseFloat(campo.value) : NaN;
        if (!isNaN(valor)) soma += valor;
    }

    texto.textContent = `${formatarNumero(soma, 4)} / 1`;
    wrap.className = numeroQuaseInteiro(soma - 1, 1e-6) ? "peso-sum status pesos-ok" : "peso-sum status pesos-erro";
}

function calcularMediaDinamica() {
    const quantidade = parseInt(obterElemento("quantidadeNotas").value);
    const status = obterElemento("status");

    if (isNaN(quantidade) || quantidade < 2 || quantidade > 10) {
        escrever("media", "Defina entre 2 e 10.");
        status.className = "status aviso";
        status.textContent = "Indique primeiro quantas notas quer usar.";
        return;
    }

    let soma = 0;
    let somaPesos = 0;
    let notaFinal = 0;

    for (let i = 1; i <= quantidade; i++) {
        const campoNota = obterElemento(`nota${i}`);
        const nota = parseFloat(campoNota.value);

        if (isNaN(nota) || nota < 0 || nota > escalaNotas) {
            escrever("media", "Notas inválidas.");
            status.className = "status aviso";
            status.textContent = `A Nota ${i} deve estar entre 0 e ${escalaNotas}.`;
            return;
        }

        if (modoNotas === "media") {
            soma += nota;
        } else {
            const campoPeso = obterElemento(`peso${i}`);
            const peso = parseFloat(campoPeso.value);

            if (isNaN(peso) || peso <= 0 || peso >= 1) {
                escrever("media", "Pesos inválidos.");
                status.className = "status aviso";
                status.textContent = `O Peso ${i} deve ser maior que 0 e menor que 1.`;
                return;
            }

            somaPesos += peso;
            notaFinal += nota * peso;
        }
    }

    if (modoNotas === "peso" && !numeroQuaseInteiro(somaPesos - 1, 1e-6)) {
        escrever("media", "Pesos inválidos.");
        status.className = "status aviso";
        status.textContent = "A soma de todos os pesos tem de ser exatamente 1.";
        return;
    }

    const resultado = modoNotas === "media" ? soma / quantidade : notaFinal;
    escrever("media", formatarNumero(resultado, 2));
    status.className = "status aprovado";
    status.textContent = modoNotas === "media" ? "Cálculo da média concluído." : "Cálculo por pesos concluído.";
}

/* =========================
   OPERAÇÕES
========================= */
let memoria1 = null;
let memoria2 = null;
let memoria1Linha = null;
let memoria2Linha = null;
let ultimaOperacao = "";

let campoAtivo = "v1";
let modoAngular = "graus";
const historicoFuncoes = {
    v1: [],
    v2: []
};

function alternarAjudaOperacoes() {
    obterElemento("ajudaOperacoes").classList.toggle("hidden");
}

function definirCampoAtivo(campo) {
    campoAtivo = campo;
    obterElemento("fieldWrap1").classList.toggle("active-target", campo === "v1");
    obterElemento("fieldWrap2").classList.toggle("active-target", campo === "v2");
    atualizarBotoesFuncoesAtivos();
}

function limparFuncoesCampo(campo) {
    historicoFuncoes[campo] = [];
    atualizarBotoesFuncoesAtivos();
}

function atualizarBotoesFuncoesAtivos() {
    const ids = ["cos", "acos", "sin", "asin", "square", "tan", "atan", "sqrt"];
    ids.forEach(id => {
        obterElemento(`func-${id}`).classList.remove("func-active");
    });

    historicoFuncoes[campoAtivo].forEach(id => {
        const botao = obterElemento(`func-${id}`);
        if (botao) botao.classList.add("func-active");
    });
}

function mostrarMensagemOperacoes(texto) {
    const caixa = obterElemento("mensagemOperacoes");
    caixa.textContent = texto;
    caixa.classList.remove("hidden");
}

function esconderMensagemOperacoes() {
    const caixa = obterElemento("mensagemOperacoes");
    caixa.textContent = "";
    caixa.classList.add("hidden");
}

function obterCampoPreferidoParaInsercao() {
    if (campoAtivo === "v1" || campoAtivo === "v2") return campoAtivo;
    return "v1";
}

function inserirValorNosCampos(valorTexto) {
    let alvo = obterCampoPreferidoParaInsercao();

    if (obterElemento(alvo).value !== "" && alvo === "v1" && obterElemento("v2").value === "") {
        alvo = "v2";
    }

    obterElemento(alvo).value = valorTexto;
    limparFuncoesCampo(alvo);
    definirCampoAtivo(alvo);
    esconderMensagemOperacoes();
}

function inserirTextoNoCampo(texto) {
    const campo = obterCampoPreferidoParaInsercao();
    const input = obterElemento(campo);

    if (texto === "/" && input.value.includes("/")) return;
    if (texto === "-" && input.value.length > 0) return;

    input.value += texto;
    limparFuncoesCampo(campo);
    definirCampoAtivo(campo);
    esconderMensagemOperacoes();
}

function apagarUltimoDoCampo() {
    const campo = obterCampoPreferidoParaInsercao();
    const input = obterElemento(campo);

    input.value = input.value.slice(0, -1);
    limparFuncoesCampo(campo);
    definirCampoAtivo(campo);
    esconderMensagemOperacoes();
}

function limparCampoAtivo() {
    const campo = obterCampoPreferidoParaInsercao();
    obterElemento(campo).value = "";
    limparFuncoesCampo(campo);
    definirCampoAtivo(campo);
    esconderMensagemOperacoes();
}

function usarPi() {
    inserirValorNosCampos(formatarValorCampo(Math.PI));
}

function usarE() {
    inserirValorNosCampos(formatarValorCampo(Math.E));
}

function usarM1() {
    if (memoria1 !== null) inserirValorNosCampos(formatarValorCampo(memoria1));
}

function usarM2() {
    if (memoria2 !== null) inserirValorNosCampos(formatarValorCampo(memoria2));
}

function limparCamposOperacoes() {
    obterElemento("v1").value = "";
    obterElemento("v2").value = "";
    historicoFuncoes.v1 = [];
    historicoFuncoes.v2 = [];
    esconderMensagemOperacoes();
    definirCampoAtivo("v1");
}

function definirModoAngular(modo) {
    modoAngular = modo;
    obterElemento("btnGraus").classList.toggle("mode-active", modo === "graus");
    obterElemento("btnRad").classList.toggle("mode-active", modo === "rad");
}

function paraRadianos(valor) {
    return modoAngular === "graus" ? valor * Math.PI / 180 : valor;
}

function paraModoAtual(valorEmRad) {
    return modoAngular === "graus" ? valorEmRad * 180 / Math.PI : valorEmRad;
}

function obterCampoParaTransformar() {
    const analiseAtivo = analisarValorCampo(obterElemento(campoAtivo).value);
    if (analiseAtivo.ok) return campoAtivo;

    const outro = campoAtivo === "v1" ? "v2" : "v1";
    const analiseOutro = analisarValorCampo(obterElemento(outro).value);
    if (analiseOutro.ok) return outro;

    return null;
}

function aplicarFuncaoCampo(funcao) {
    const campo = obterCampoParaTransformar();

    if (!campo) {
        mostrarMensagemOperacoes("Introduza primeiro um valor válido em Valor 1 ou Valor 2.");
        return;
    }

    const analise = analisarValorCampo(obterElemento(campo).value);
    if (!analise.ok) {
        mostrarMensagemOperacoes(analise.erro);
        return;
    }

    const valor = analise.valor;
    let resultado = null;
    let mensagemErro = "";

    if (funcao === "cos") {
        resultado = Math.cos(paraRadianos(valor));
    } else if (funcao === "sin") {
        resultado = Math.sin(paraRadianos(valor));
    } else if (funcao === "tan") {
        resultado = Math.tan(paraRadianos(valor));
    } else if (funcao === "acos") {
        if (valor < -1 || valor > 1) {
            mensagemErro = "cos⁻¹(x) só está definido para valores entre -1 e 1.";
        } else {
            resultado = paraModoAtual(Math.acos(valor));
        }
    } else if (funcao === "asin") {
        if (valor < -1 || valor > 1) {
            mensagemErro = "sen⁻¹(x) só está definido para valores entre -1 e 1.";
        } else {
            resultado = paraModoAtual(Math.asin(valor));
        }
    } else if (funcao === "atan") {
        resultado = paraModoAtual(Math.atan(valor));
    } else if (funcao === "square") {
        resultado = Math.pow(valor, 2);
    } else if (funcao === "sqrt") {
        if (valor < 0) {
            mensagemErro = "√(x) não está definida nos números reais para valores negativos.";
        } else {
            resultado = Math.sqrt(valor);
        }
    }

    if (mensagemErro) {
        mostrarMensagemOperacoes(mensagemErro);
        return;
    }

    if (!Number.isFinite(resultado)) {
        mostrarMensagemOperacoes("A operação pedida não produziu um resultado real válido.");
        return;
    }

    obterElemento(campo).value = formatarValorCampo(resultado);

    if (!historicoFuncoes[campo].includes(funcao)) {
        historicoFuncoes[campo].push(funcao);
    }

    definirCampoAtivo(campo);
    esconderMensagemOperacoes();
}

/* ===== memórias ===== */
function atualizarMemoriasVisuais() {
    escrever("memoria1Valor", memoria1 === null ? "vazia" : formatarNumero(memoria1, 4));
    escrever("memoria2Valor", memoria2 === null ? "vazia" : formatarNumero(memoria2, 4));

    obterElemento("memoryChip1").classList.toggle("active-m1", memoria1 !== null);
    obterElemento("memoryChip2").classList.toggle("active-m2", memoria2 !== null);
    obterElemento("btnUsarM1").classList.toggle("memory-top-active", memoria1 !== null);
    obterElemento("btnUsarM2").classList.toggle("memory-top-active", memoria2 !== null);
}

function guardarNaMemoria(memoria, valor, linhaId) {
    if (!Number.isFinite(valor)) return;

    const normalizado = normalizarNumero(valor);

    if (memoria === 1) {
        memoria1 = normalizado;
        memoria1Linha = linhaId;
    } else {
        memoria2 = normalizado;
        memoria2Linha = linhaId;
    }

    atualizarMemoriasVisuais();
}

/* ===== operadores ===== */
function limparEstadoOperacoesVisuais() {
    ["btnSoma", "btnSubtracao", "btnMultiplicacao", "btnDivisao"]
        .forEach(id => obterElemento(id).classList.remove("active-operation"));
}

function destacarOperacaoAtiva(idBotao) {
    limparEstadoOperacoesVisuais();
    obterElemento(idBotao).classList.add("active-operation");
}

function obterValoresOperacoes() {
    const analise1 = analisarValorCampo(obterElemento("v1").value);
    const analise2 = analisarValorCampo(obterElemento("v2").value);

    if (!analise1.ok || !analise2.ok) {
        mostrarLinhasResultados([
            criarLinhaResultado("resultado", "Resultado", NaN, "Introduza dois valores válidos.")
        ]);
        return null;
    }

    return {
        v1: analise1.valor,
        v2: analise2.valor,
        f1: analise1,
        f2: analise2
    };
}

/* ===== matemática ===== */
function fatorial(n) {
    if (!eInteiro(n) || n < 0) return null;
    if (n > 170) return null;

    let resultado = 1;
    for (let i = 2; i <= n; i++) {
        resultado *= i;
    }
    return normalizarNumero(resultado);
}

function mdc(a, b) {
    a = Math.abs(Math.trunc(a));
    b = Math.abs(Math.trunc(b));

    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }

    return a;
}

function mmc(a, b) {
    a = Math.abs(Math.trunc(a));
    b = Math.abs(Math.trunc(b));

    if (a === 0 || b === 0) return 0;
    return normalizarNumero(Math.abs(a * b) / mdc(a, b));
}

function simplificarFracao(numerador, denominador) {
    if (denominador === 0) return null;

    if (denominador < 0) {
        numerador = -numerador;
        denominador = -denominador;
    }

    const divisor = mdcInteiro(numerador, denominador);
    numerador /= divisor;
    denominador /= divisor;

    return `${numerador}/${denominador}`;
}

function fracaoExataDaOperacao(f1, f2, operacao, resultadoPrincipal) {
    let numerador;
    let denominador;

    if (operacao === "soma") {
        numerador = f1.numerador * f2.denominador + f2.numerador * f1.denominador;
        denominador = f1.denominador * f2.denominador;
    } else if (operacao === "subtracao") {
        numerador = f1.numerador * f2.denominador - f2.numerador * f1.denominador;
        denominador = f1.denominador * f2.denominador;
    } else if (operacao === "multiplicacao") {
        numerador = f1.numerador * f2.numerador;
        denominador = f1.denominador * f2.denominador;
    } else if (operacao === "divisao") {
        if (f2.numerador === 0) return null;
        numerador = f1.numerador * f2.denominador;
        denominador = f1.denominador * f2.numerador;
    } else {
        return simplificarFracao(Math.round(resultadoPrincipal * 100000000), 100000000);
    }

    return simplificarFracao(numerador, denominador);
}

function raizIndice(indice, valor) {
    if (!eInteiro(indice) || indice < 2) return null;

    if (valor < 0) {
        if (indice % 2 === 0) return null;
        return normalizarNumero(-Math.pow(Math.abs(valor), 1 / indice));
    }

    return normalizarNumero(Math.pow(valor, 1 / indice));
}

function fatorizacaoPrimos(n) {
    if (!eInteiro(n) || Math.abs(n) <= 1) return null;

    let numero = Math.abs(n);
    const fatores = {};

    let divisor = 2;
    while (numero > 1) {
        while (numero % divisor === 0) {
            fatores[divisor] = (fatores[divisor] || 0) + 1;
            numero /= divisor;
        }
        divisor++;
        if (divisor * divisor > numero && numero > 1) {
            fatores[numero] = (fatores[numero] || 0) + 1;
            break;
        }
    }

    return Object.entries(fatores)
        .map(([primo, expoente]) => expoente > 1 ? `${primo}<sup>${expoente}</sup>` : `${primo}`)
        .join(" × ");
}

/* ===== resultados ===== */
function criarLinhaResultado(id, rotulo, valorNumerico, valorTexto = null) {
    const normalizado = Number.isFinite(valorNumerico) ? normalizarNumero(valorNumerico) : valorNumerico;

    return {
        id,
        rotulo,
        valorNumerico: normalizado,
        valorTexto: valorTexto !== null ? valorTexto : formatarNumero(normalizado, 4)
    };
}

function mostrarLinhasResultados(linhas) {
    const container = obterElemento("extraResultados");

    if (!linhas.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = linhas.map((linha) => {
        const podeGuardar = Number.isFinite(linha.valorNumerico);
        const classeM1 = memoria1Linha === linha.id ? "active-m1" : "";
        const classeM2 = memoria2Linha === linha.id ? "active-m2" : "";

        return `
            <div class="advanced-row">
                <div class="advanced-info">
                    <strong>${linha.rotulo}</strong>
                    <span>${linha.valorTexto}</span>
                </div>
                <div class="memory-buttons">
                    <button
                        type="button"
                        class="${classeM1}"
                        onclick="${podeGuardar ? `guardarMemoriaERenderizar(1, ${linha.valorNumerico}, '${linha.id}')` : ''}"
                        ${podeGuardar ? '' : 'disabled'}
                    >
                        M1
                    </button>
                    <button
                        type="button"
                        class="${classeM2}"
                        onclick="${podeGuardar ? `guardarMemoriaERenderizar(2, ${linha.valorNumerico}, '${linha.id}')` : ''}"
                        ${podeGuardar ? '' : 'disabled'}
                    >
                        M2
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function guardarMemoriaERenderizar(memoria, valor, linhaId) {
    guardarNaMemoria(memoria, valor, linhaId);
    repetirUltimaOperacao();
}

function construirResultadosAvancados(valores, resultadoPrincipal) {
    const { v1, v2, f1, f2 } = valores;
    const linhas = [];

    linhas.push(criarLinhaResultado("resultado", "Resultado", resultadoPrincipal));

    const fracao = fracaoExataDaOperacao(f1, f2, ultimaOperacao, resultadoPrincipal);
    if (fracao !== null) {
        linhas.push(criarLinhaResultado("fracao-irredutivel", "Fração irredutível", resultadoPrincipal, fracao));
    }

    if (v1 >= 0) linhas.push(criarLinhaResultado("raiz-v1", "√(v1)", Math.sqrt(v1)));
    if (v2 >= 0) linhas.push(criarLinhaResultado("raiz-v2", "√(v2)", Math.sqrt(v2)));

    const resultadoRaizIndice = raizIndice(v1, v2);
    if (resultadoRaizIndice !== null && Number.isFinite(resultadoRaizIndice)) {
        linhas.push(criarLinhaResultado("raiz-indice", `[${v1}]√(${v2})`, resultadoRaizIndice));
    }

    if (v1 > 0 && v1 !== 1 && v2 > 0) {
        linhas.push(criarLinhaResultado("logaritmo", `log₍${v1}₎(${v2})`, Math.log(v2) / Math.log(v1)));
    }

    if (eInteiro(v1) && v1 >= 0) {
        const fat1 = fatorial(v1);
        if (fat1 !== null) linhas.push(criarLinhaResultado("fatorial-v1", `${v1}!`, fat1, String(fat1)));
    }

    if (eInteiro(v2) && v2 >= 0) {
        const fat2 = fatorial(v2);
        if (fat2 !== null) linhas.push(criarLinhaResultado("fatorial-v2", `${v2}!`, fat2, String(fat2)));
    }

    if (eInteiro(v1) && eInteiro(v2) && v1 >= v2 && v2 >= 0) {
        const fatV1 = fatorial(v1);
        const fatV2 = fatorial(v2);
        const fatDif = fatorial(v1 - v2);

        if (fatV1 !== null && fatV2 !== null && fatDif !== null) {
            const combinacoes = normalizarNumero(fatV1 / (fatV2 * fatDif));
            const arranjos = normalizarNumero(fatV1 / fatDif);

            linhas.push(criarLinhaResultado("combinacoes", `C(${v1}, ${v2})`, combinacoes, String(combinacoes)));
            linhas.push(criarLinhaResultado("arranjos", `A(${v1}, ${v2})`, arranjos, String(arranjos)));
        }
    }

    if (eInteiro(v1) && eInteiro(v2)) {
        const absV1 = Math.abs(v1);
        const absV2 = Math.abs(v2);

        const valorMdc = mdc(v1, v2);
        const valorMmc = mmc(v1, v2);

        linhas.push(criarLinhaResultado("mdc", `m.d.c.(${absV1}, ${absV2})`, valorMdc, String(valorMdc)));
        linhas.push(criarLinhaResultado("mmc", `m.m.c.(${absV1}, ${absV2})`, valorMmc, String(valorMmc)));

        const fatPrimosV1 = fatorizacaoPrimos(v1);
        if (fatPrimosV1 !== null) {
            linhas.push(criarLinhaResultado("fatorizacao-v1", `Fatorização prima de ${absV1}`, absV1, fatPrimosV1));
        }

        const fatPrimosV2 = fatorizacaoPrimos(v2);
        if (fatPrimosV2 !== null) {
            linhas.push(criarLinhaResultado("fatorizacao-v2", `Fatorização prima de ${absV2}`, absV2, fatPrimosV2));
        }
    }

    if (
        ultimaOperacao === "divisao" &&
        v2 !== 0 &&
        eInteiro(v1) &&
        eInteiro(v2) &&
        v2 <= v1
    ) {
        const resto = normalizarNumero(v1 % v2);
        linhas.push(criarLinhaResultado("resto-divisao", `Resto de ${v1} ÷ ${v2}`, resto, String(resto)));
    }

    return linhas;
}

function repetirUltimaOperacao() {
    if (ultimaOperacao === "soma") somar();
    else if (ultimaOperacao === "subtracao") subtrair();
    else if (ultimaOperacao === "multiplicacao") multiplicar();
    else if (ultimaOperacao === "divisao") dividir();
}

function somar() {
    const valores = obterValoresOperacoes();
    if (!valores) return;

    ultimaOperacao = "soma";
    destacarOperacaoAtiva("btnSoma");

    const resultado = normalizarNumero(valores.v1 + valores.v2);
    mostrarLinhasResultados(construirResultadosAvancados(valores, resultado));
}

function subtrair() {
    const valores = obterValoresOperacoes();
    if (!valores) return;

    ultimaOperacao = "subtracao";
    destacarOperacaoAtiva("btnSubtracao");

    const resultado = normalizarNumero(valores.v1 - valores.v2);
    mostrarLinhasResultados(construirResultadosAvancados(valores, resultado));
}

function multiplicar() {
    const valores = obterValoresOperacoes();
    if (!valores) return;

    ultimaOperacao = "multiplicacao";
    destacarOperacaoAtiva("btnMultiplicacao");

    const resultado = normalizarNumero(valores.v1 * valores.v2);
    mostrarLinhasResultados(construirResultadosAvancados(valores, resultado));
}

function dividir() {
    const valores = obterValoresOperacoes();
    if (!valores) return;

    ultimaOperacao = "divisao";
    destacarOperacaoAtiva("btnDivisao");

    if (valores.v2 === 0) {
        mostrarLinhasResultados([
            criarLinhaResultado("resultado", "Resultado", NaN, "Erro: divisão por zero.")
        ]);
        return;
    }

    const resultado = normalizarNumero(valores.v1 / valores.v2);
    mostrarLinhasResultados(construirResultadosAvancados(valores, resultado));
}

/* =========================
   IMC
========================= */
let generoSelecionado = "mulher";

function selecionarGenero(genero) {
    generoSelecionado = genero;
    obterElemento("btnGeneroHomem").classList.toggle("active-gender-m1", genero === "homem");
    obterElemento("btnGeneroMulher").classList.toggle("active-gender-m2", genero === "mulher");
}

function alternarPlanoReceita() {
    obterElemento("planoReceitaConteudo").classList.toggle("hidden");
}

function calcularIMCAtual() {
    calcularIMC(generoSelecionado);
}

function calcularIMC(genero) {
    const altura = parseFloat(obterElemento("altura").value);
    const peso = parseFloat(obterElemento("peso").value);
    const idade = parseFloat(obterElemento("idade").value);

    if (
        isNaN(altura) || isNaN(peso) || isNaN(idade) ||
        altura <= 0 || peso <= 0 || idade <= 0
    ) {
        escrever("pesoIdeal", "Preencha corretamente.");
        escrever("imc", "—");
        escrever("classificacao", "—");
        escrever("recomendacao", "—");
        escrever("ritmoSaudavel", "—");
        escrever("tempoEstimado", "—");
        obterElemento("planoReceitaWrap").classList.add("hidden");
        return;
    }

    let pesoIdeal = genero === "homem"
        ? (72.7 * altura) - 58
        : (62.1 * altura) - 44.7;

    const imc = peso / (altura * altura);
    let classificacao = "";
    let recomendacao = "";

    if (idade < 20 || idade > 65) {
        classificacao = "Válido para idades entre os 20 e os 65 anos";
        recomendacao = "Esta calculadora aplica a classificação do IMC apenas a adultos entre os 20 e os 65 anos.";
    } else if (imc < 16) {
        classificacao = "Magreza Grau III";
    } else if (imc < 17) {
        classificacao = "Magreza Grau II";
    } else if (imc < 18.5) {
        classificacao = "Magreza Grau I";
    } else if (imc < 25) {
        classificacao = "Adequado";
    } else if (imc < 30) {
        classificacao = "Pré-Obeso";
    } else if (imc < 35) {
        classificacao = "Obesidade Grau I";
    } else if (imc < 40) {
        classificacao = "Obesidade Grau II";
    } else {
        classificacao = "Obesidade Grau III";
    }

    const diferenca = peso - pesoIdeal;
    const diferencaAbs = Math.abs(diferenca);

    let precisaPerder = false;

    if (idade >= 20 && idade <= 65) {
        if (diferencaAbs <= 2) {
            recomendacao = "O seu peso está próximo do peso ideal. Recomenda-se manter hábitos de vida saudáveis e estabilidade do peso.";
        } else if (diferenca > 2) {
            precisaPerder = true;
            recomendacao = `O seu peso está acima do ideal. Recomenda-se perder cerca de ${formatarNumero(diferencaAbs, 2)} kg de forma gradual e saudável.`;
        } else {
            recomendacao = `O seu peso está abaixo do ideal. Recomenda-se ganhar cerca de ${formatarNumero(diferencaAbs, 2)} kg de forma equilibrada e saudável.`;
        }
    }

    escrever("pesoIdeal", `${formatarNumero(pesoIdeal, 2)} kg`);
    escrever("imc", formatarNumero(imc, 2));
    escrever("classificacao", classificacao);
    escrever("recomendacao", recomendacao);

    if (precisaPerder) {
        const ritmoSemanal = 0.5;
        const semanas = Math.ceil(diferencaAbs / ritmoSemanal);
        escrever("ritmoSaudavel", "Perda gradual de cerca de 0.5 kg por semana");
        escrever("tempoEstimado", `${semanas} semana(s) aproximadamente`);
        obterElemento("planoReceitaWrap").classList.remove("hidden");
    } else {
        escrever("ritmoSaudavel", "Não aplicável");
        escrever("tempoEstimado", "Não aplicável");
        obterElemento("planoReceitaWrap").classList.add("hidden");
        obterElemento("planoReceitaConteudo").classList.add("hidden");
    }
}

/* =========================
   CIRCUNFERÊNCIA
========================= */
function calcularCircunferencia() {
    const raio = parseFloat(obterElemento("raio").value);

    if (isNaN(raio) || raio < 0) {
        escrever("perimetro", "Valor inválido");
        escrever("area", "Valor inválido");
        return;
    }

    const perimetro = 2 * Math.PI * raio;
    const area = Math.PI * Math.pow(raio, 2);

    escrever("perimetro", formatarNumero(perimetro, 2));
    escrever("area", formatarNumero(area, 2));
}

/* =========================
   DATAS
========================= */
function calcularDatas() {
    const dataInicialValor = obterElemento("data1").value;
    const dataFinalValor = obterElemento("data2").value;

    if (!dataInicialValor || !dataFinalValor) {
        escrever("amd", "Preencha as duas datas.");
        escrever("md", "Preencha as duas datas.");
        escrever("dias", "Preencha as duas datas.");
        return;
    }

    let inicio = new Date(dataInicialValor);
    let fim = new Date(dataFinalValor);

    if (inicio > fim) {
        const temp = inicio;
        inicio = fim;
        fim = temp;
    }

    const diferencaMs = fim - inicio;
    const totalDias = Math.floor(diferencaMs / (1000 * 60 * 60 * 24));

    let anos = fim.getFullYear() - inicio.getFullYear();
    let meses = fim.getMonth() - inicio.getMonth();
    let dias = fim.getDate() - inicio.getDate();

    if (dias < 0) {
        meses--;
        const diasNoMesAnterior = new Date(fim.getFullYear(), fim.getMonth(), 0).getDate();
        dias += diasNoMesAnterior;
    }

    if (meses < 0) {
        anos--;
        meses += 12;
    }

    const totalMeses = anos * 12 + meses;

    escrever("amd", `${anos} ano(s), ${meses} mês(es) e ${dias} dia(s)`);
    escrever("md", `${totalMeses} mês(es) e ${dias} dia(s)`);
    escrever("dias", `${totalDias} dia(s)`);
}

/* =========================
   EVENTOS
========================= */
obterElemento("v1").addEventListener("focus", () => definirCampoAtivo("v1"));
obterElemento("v2").addEventListener("focus", () => definirCampoAtivo("v2"));

obterElemento("v1").addEventListener("input", () => {
    limparFuncoesCampo("v1");
    definirCampoAtivo("v1");
    esconderMensagemOperacoes();
});

obterElemento("v2").addEventListener("input", () => {
    limparFuncoesCampo("v2");
    definirCampoAtivo("v2");
    esconderMensagemOperacoes();
});

/* =========================
   INICIALIZAÇÃO
========================= */
atualizarMemoriasVisuais();
definirCampoAtivo("v1");
definirModoAngular("graus");
esconderMensagemOperacoes();
selecionarGenero("mulher");
selecionarModoNotas("media");
selecionarEscalaNotas(100);