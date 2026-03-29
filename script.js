function obterElemento(id) {
    return document.getElementById(id);
}

function escrever(id, texto) {
    const el = obterElemento(id);
    if (el) el.textContent = texto;
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
        return { numerador: sinal * inteiro, denominador: 1 };
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
        if (!fracao) return { ok: false, erro: "Valor inválido." };

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
        const base = 1 / quantidade;
        let somaTemp = 0;
        for (let i = 1; i <= quantidade; i++) {
            const campoPeso = obterElemento(`peso${i}`);
            if (i < quantidade) {
                const valor = Number(base.toFixed(2));
                somaTemp += valor;
                campoPeso.value = valor.toFixed(2);
            } else {
                campoPeso.value = Number((1 - somaTemp).toFixed(2)).toFixed(2);
            }
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
        if (campoPeso) campoPeso.addEventListener("input", atualizarSomaPesos);
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
        const nota = parseFloat(obterElemento(`nota${i}`).value);

        if (isNaN(nota) || nota < 0 || nota > escalaNotas) {
            escrever("media", "Notas inválidas.");
            status.className = "status aviso";
            status.textContent = `A Nota ${i} deve estar entre 0 e ${escalaNotas}.`;
            return;
        }

        if (modoNotas === "media") {
            soma += nota;
        } else {
            const peso = parseFloat(obterElemento(`peso${i}`).value);
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
let campoCoefAtivo = null;
const historicoFuncoes = { v1: [], v2: [] };

function alternarAjudaOperacoes() {
    obterElemento("ajudaOperacoes").classList.toggle("hidden");
}

function definirCampoAtivo(campo) {
    campoAtivo = campo;
    campoCoefAtivo = null;

    obterElemento("fieldWrap1").classList.toggle("active-target", campo === "v1");
    obterElemento("fieldWrap2").classList.toggle("active-target", campo === "v2");

    ["coefA", "coefB", "coefC"].forEach(id => {
        const el = obterElemento(id);
        if (el) el.classList.remove("active-coef");
    });

    atualizarBotoesFuncoesAtivos();
}

function definirCoefAtivo(id) {
    campoCoefAtivo = id;
    obterElemento("fieldWrap1").classList.remove("active-target");
    obterElemento("fieldWrap2").classList.remove("active-target");

    ["coefA", "coefB", "coefC"].forEach(coefId => {
        const el = obterElemento(coefId);
        if (el) el.classList.toggle("active-coef", coefId === id);
    });

    atualizarBotoesFuncoesAtivos();
}

function limparFuncoesCampo(campo) {
    historicoFuncoes[campo] = [];
    atualizarBotoesFuncoesAtivos();
}

function atualizarBotoesFuncoesAtivos() {
    ["cos", "acos", "sin", "asin", "square", "tan", "atan", "sqrt"].forEach(id => {
        const el = obterElemento(`func-${id}`);
        if (el) el.classList.remove("func-active");
    });

    if (campoCoefAtivo) return;

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

function alvoEntradaAtual() {
    if (campoCoefAtivo) return campoCoefAtivo;
    return campoAtivo;
}

function inserirNoAlvoAtual(texto, substituir = false) {
    const id = alvoEntradaAtual();
    const input = obterElemento(id);

    if (substituir) {
        input.value = texto;
    } else {
        if (texto === "/" && input.value.includes("/")) return;
        if (texto === "-" && input.value.length > 0) return;
        input.value += texto;
    }

    if (id === "v1" || id === "v2") {
        limparFuncoesCampo(id);
        definirCampoAtivo(id);
    } else {
        definirCoefAtivo(id);
    }

    esconderMensagemOperacoes();
}

function inserirTextoNoCampo(texto) {
    inserirNoAlvoAtual(texto, false);
}

function apagarUltimoDoCampo() {
    const id = alvoEntradaAtual();
    const input = obterElemento(id);
    input.value = input.value.slice(0, -1);

    if (id === "v1" || id === "v2") {
        limparFuncoesCampo(id);
        definirCampoAtivo(id);
    } else {
        definirCoefAtivo(id);
    }

    esconderMensagemOperacoes();
}

function usarPi() {
    inserirNoAlvoAtual(formatarValorCampo(Math.PI), true);
}

function usarE() {
    inserirNoAlvoAtual(formatarValorCampo(Math.E), true);
}

function usarM1() {
    if (memoria1 !== null) inserirNoAlvoAtual(formatarValorCampo(memoria1), true);
}

function usarM2() {
    if (memoria2 !== null) inserirNoAlvoAtual(formatarValorCampo(memoria2), true);
}

function limparCamposOperacoes() {
    obterElemento("v1").value = "";
    obterElemento("v2").value = "";
    historicoFuncoes.v1 = [];
    historicoFuncoes.v2 = [];
    esconderMensagemOperacoes();
    definirCampoAtivo("v1");

    ["coefA", "coefB", "coefC"].forEach(id => {
        const el = obterElemento(id);
        if (el) {
            el.value = "";
            el.classList.remove("active-coef");
        }
    });

    escreverResultado2G("");
    esconderPainel2GResultado();
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
    if (campoCoefAtivo) return campoCoefAtivo;

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
        mostrarMensagemOperacoes("Introduza primeiro um valor válido.");
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
        if (valor < -1 || valor > 1) mensagemErro = "cos⁻¹(x) só está definido para valores entre -1 e 1.";
        else resultado = paraModoAtual(Math.acos(valor));
    } else if (funcao === "asin") {
        if (valor < -1 || valor > 1) mensagemErro = "sen⁻¹(x) só está definido para valores entre -1 e 1.";
        else resultado = paraModoAtual(Math.asin(valor));
    } else if (funcao === "atan") {
        resultado = paraModoAtual(Math.atan(valor));
    } else if (funcao === "square") {
        resultado = Math.pow(valor, 2);
    } else if (funcao === "sqrt") {
        if (valor < 0) {
            mensagemErro = "√(x) não está definida nos números reais para valores negativos.";
        } else {
            resultado = Math.sqrt(valor);
            if (eInteiro(valor)) {
                const simplificada = simplificarRaizInteira(valor);
                if (simplificada && simplificada.includes("√")) {
                    mostrarMensagemOperacoes(`Raiz simplificada: ${simplificada}`);
                }
            }
        }
    }

    if (mensagemErro) {
        mostrarMensagemOperacoes(mensagemErro);
        return;
    }

    if (!Number.isFinite(resultado)) {
        mostrarMensagemOperacoes("A operação não produziu um resultado real válido.");
        return;
    }

    obterElemento(campo).value = formatarValorCampo(resultado);

    if (campo === "v1" || campo === "v2") {
        if (!historicoFuncoes[campo].includes(funcao)) {
            historicoFuncoes[campo].push(funcao);
        }
        definirCampoAtivo(campo);
    } else {
        definirCoefAtivo(campo);
    }

    if (!(funcao === "sqrt" && eInteiro(valor) && simplificarRaizInteira(valor)?.includes("√"))) {
        esconderMensagemOperacoes();
    }
}

function alternarPainel2G() {
    const painel = obterElemento("painel2G");
    const botao = obterElemento("btn2G");
    const vaiAbrir = painel.classList.contains("hidden");

    painel.classList.toggle("hidden");
    botao.classList.toggle("active-promote", vaiAbrir);

    if (vaiAbrir) {
        definirCoefAtivo("coefA");
    } else {
        campoCoefAtivo = null;
        ["coefA", "coefB", "coefC"].forEach(id => {
            const el = obterElemento(id);
            if (el) el.classList.remove("active-coef");
        });
        escreverResultado2G("");
        esconderPainel2GResultado();
        definirCampoAtivo("v1");
    }
}

function escreverResultado2G(texto) {
    obterElemento("resultado2G").innerHTML = texto;
}

function esconderPainel2GResultado() {
    obterElemento("resultado2G").classList.add("hidden");
}

function mostrarPainel2GResultado() {
    obterElemento("resultado2G").classList.remove("hidden");
}

function executarSegundoGrau() {
    const analiseA = analisarValorCampo(obterElemento("coefA").value);
    const analiseB = analisarValorCampo(obterElemento("coefB").value);
    const analiseC = analisarValorCampo(obterElemento("coefC").value);

    if (!analiseA.ok || !analiseB.ok || !analiseC.ok) {
        escreverResultado2G("Preencha corretamente os valores de a, b e c. Pode usar frações como 1/2.");
        mostrarPainel2GResultado();
        return;
    }

    const a = analiseA.valor;
    const b = analiseB.valor;
    const c = analiseC.valor;

    if (a === 0) {
        escreverResultado2G("Impossível executar: na equação do 2.º grau, a tem de ser diferente de 0.");
        mostrarPainel2GResultado();
        return;
    }

    const delta = b * b - 4 * a * c;

    if (delta < 0) {
        escreverResultado2G(`Δ = ${formatarNumero(delta, 4)}<br>Sem solução real.`);
        mostrarPainel2GResultado();
        return;
    }

    if (numeroQuaseInteiro(delta, 1e-10)) {
        const deltaNorm = normalizarNumero(delta);

        if (deltaNorm === 0) {
            const x = normalizarNumero((-b) / (2 * a));
            escreverResultado2G(`Δ = 0<br>1 solução: x = ${formatarNumero(x, 6)}`);
            mostrarPainel2GResultado();
            return;
        }

        const sqrtDelta = Math.sqrt(deltaNorm);
        const x1 = normalizarNumero((-b + sqrtDelta) / (2 * a));
        const x2 = normalizarNumero((-b - sqrtDelta) / (2 * a));

        escreverResultado2G(
            `Δ = ${formatarNumero(deltaNorm, 4)}<br>2 soluções:<br>x₁ = ${formatarNumero(x1, 6)}<br>x₂ = ${formatarNumero(x2, 6)}`
        );
        mostrarPainel2GResultado();
        return;
    }

    const sqrtDelta = Math.sqrt(delta);
    const x1 = normalizarNumero((-b + sqrtDelta) / (2 * a));
    const x2 = normalizarNumero((-b - sqrtDelta) / (2 * a));

    escreverResultado2G(
        `Δ = ${formatarNumero(delta, 4)}<br>2 soluções:<br>x₁ = ${formatarNumero(x1, 6)}<br>x₂ = ${formatarNumero(x2, 6)}`
    );
    mostrarPainel2GResultado();
}

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

function limparEstadoOperacoesVisuais() {
    ["btnSoma", "btnSubtracao", "btnMultiplicacao", "btnDivisao"]
        .forEach(id => obterElemento(id).classList.remove("active-operation"));
}

function destacarOperacaoAtiva(idBotao) {
    limparEstadoOperacoesVisuais();
    obterElemento(idBotao).classList.add("active-operation");
}

function fatorial(n) {
    if (!eInteiro(n) || n < 0 || n > 170) return null;
    let resultado = 1;
    for (let i = 2; i <= n; i++) resultado *= i;
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
    return `${numerador / divisor}/${denominador / divisor}`;
}

function decimalParaFracaoBonita(valor) {
    if (!Number.isFinite(valor)) return null;
    const texto = Number(valor).toFixed(8).replace(/\.?0+$/, "");
    if (!texto.includes(".")) return `${texto}/1`;
    const partes = texto.split(".");
    const casas = partes[1].length;
    const denominador = Math.pow(10, casas);
    const numerador = Math.round(Number(valor) * denominador);
    return simplificarFracao(numerador, denominador);
}

function fracaoExataDaOperacao(f1, f2, operacao, resultadoPrincipal) {
    let numerador;
    let denominador;

    if (operacao === "soma") {
        numerador = f1.numerador * f2.denominador + f2.numerador * f1.denominador;
        denominador = f1.denominador * f2.denominador;
        return simplificarFracao(numerador, denominador);
    }

    if (operacao === "subtracao") {
        numerador = f1.numerador * f2.denominador - f2.numerador * f1.denominador;
        denominador = f1.denominador * f2.denominador;
        return simplificarFracao(numerador, denominador);
    }

    if (operacao === "multiplicacao") {
        numerador = f1.numerador * f2.numerador;
        denominador = f1.denominador * f2.denominador;
        return simplificarFracao(numerador, denominador);
    }

    if (operacao === "divisao") {
        if (f2.numerador === 0) return null;
        numerador = f1.numerador * f2.denominador;
        denominador = f1.denominador * f2.numerador;
        return simplificarFracao(numerador, denominador);
    }

    return decimalParaFracaoBonita(resultadoPrincipal);
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

function simplificarRaizInteira(n) {
    if (!eInteiro(n) || n < 0) return null;
    if (n === 0) return "0";

    let maiorQuadrado = 1;
    for (let i = 1; i * i <= n; i++) {
        const quadrado = i * i;
        if (n % quadrado === 0) maiorQuadrado = quadrado;
    }

    const fora = Math.sqrt(maiorQuadrado);
    const dentro = n / maiorQuadrado;

    if (dentro === 1) return String(fora);
    if (fora === 1) return `√${dentro}`;
    return `${fora}√${dentro}`;
}

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
                    <button type="button" class="${classeM1}" onclick="${podeGuardar ? `guardarMemoriaERenderizar(1, ${linha.valorNumerico}, '${linha.id}')` : ''}" ${podeGuardar ? "" : "disabled"}>M1</button>
                    <button type="button" class="${classeM2}" onclick="${podeGuardar ? `guardarMemoriaERenderizar(2, ${linha.valorNumerico}, '${linha.id}')` : ''}" ${podeGuardar ? "" : "disabled"}>M2</button>
                </div>
            </div>
        `;
    }).join("");
}

function guardarMemoriaERenderizar(memoria, valor, linhaId) {
    guardarNaMemoria(memoria, valor, linhaId);
    repetirUltimaOperacao();
}

function combinacaoInteira(n, k) {
    if (!eInteiro(n) || !eInteiro(k) || n < k || k < 0) return null;
    k = Math.min(k, n - k);
    let resultado = 1;
    for (let i = 1; i <= k; i++) {
        resultado = (resultado * (n - k + i)) / i;
    }
    return Math.round(resultado);
}

function arranjoInteiro(n, k) {
    if (!eInteiro(n) || !eInteiro(k) || n < k || k < 0) return null;
    let resultado = 1;
    for (let i = 0; i < k; i++) resultado *= (n - i);
    return resultado;
}

function construirResultadosAvancados(valores, resultadoPrincipal) {
    const { v1, v2, f1, f2 } = valores;
    const linhas = [];

    linhas.push(criarLinhaResultado("resultado", "Resultado", resultadoPrincipal));

    const fracao = fracaoExataDaOperacao(f1, f2, ultimaOperacao, resultadoPrincipal);
    if (fracao !== null) {
        linhas.push(criarLinhaResultado("fracao-irredutivel", "Fração irredutível", resultadoPrincipal, fracao));
    }

    if (v1 >= 0) {
        linhas.push(criarLinhaResultado("raiz-v1", "√(v1)", Math.sqrt(v1)));
        if (eInteiro(v1)) {
            linhas.push(criarLinhaResultado("raiz-simpl-v1", "Raiz simplificada de v1", Math.sqrt(v1), simplificarRaizInteira(v1)));
        }
    }

    if (v2 >= 0) {
        linhas.push(criarLinhaResultado("raiz-v2", "√(v2)", Math.sqrt(v2)));
        if (eInteiro(v2)) {
            linhas.push(criarLinhaResultado("raiz-simpl-v2", "Raiz simplificada de v2", Math.sqrt(v2), simplificarRaizInteira(v2)));
        }
    }

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
        const combinacoes = combinacaoInteira(v1, v2);
        const arranjos = arranjoInteiro(v1, v2);
        if (combinacoes !== null) linhas.push(criarLinhaResultado("combinacoes", `C(${v1}, ${v2})`, combinacoes, String(combinacoes)));
        if (arranjos !== null) linhas.push(criarLinhaResultado("arranjos", `A(${v1}, ${v2})`, arranjos, String(arranjos)));
    }

    if (eInteiro(v1) && eInteiro(v2)) {
        const absV1 = Math.abs(v1);
        const absV2 = Math.abs(v2);

        linhas.push(criarLinhaResultado("mdc", `m.d.c.(${absV1}, ${absV2})`, mdc(v1, v2), String(mdc(v1, v2))));
        linhas.push(criarLinhaResultado("mmc", `m.m.c.(${absV1}, ${absV2})`, mmc(v1, v2), String(mmc(v1, v2))));

        const fatPrimosV1 = fatorizacaoPrimos(v1);
        if (fatPrimosV1 !== null) linhas.push(criarLinhaResultado("fatorizacao-v1", `Fatorização prima de ${absV1}`, absV1, fatPrimosV1));

        const fatPrimosV2 = fatorizacaoPrimos(v2);
        if (fatPrimosV2 !== null) linhas.push(criarLinhaResultado("fatorizacao-v2", `Fatorização prima de ${absV2}`, absV2, fatPrimosV2));
    }

    if (ultimaOperacao === "divisao" && v2 !== 0 && eInteiro(v1) && eInteiro(v2) && v2 <= v1) {
        const resto = normalizarNumero(v1 % v2);
        linhas.push(criarLinhaResultado("resto-divisao", `Resto de ${v1} ÷ ${v2}`, resto, String(resto)));
    }

    return linhas;
}

function obterValoresOperacoes() {
    const analise1 = analisarValorCampo(obterElemento("v1").value);
    const analise2 = analisarValorCampo(obterElemento("v2").value);

    if (!analise1.ok || !analise2.ok) {
        mostrarLinhasResultados([criarLinhaResultado("resultado", "Resultado", NaN, "Introduza dois valores válidos.")]);
        return null;
    }

    return {
        v1: analise1.valor,
        v2: analise2.valor,
        f1: analise1,
        f2: analise2
    };
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
        mostrarLinhasResultados([criarLinhaResultado("resultado", "Resultado", NaN, "Erro: divisão por zero.")]);
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
    const altura = parseFloat(obterElemento("altura").value);
    const peso = parseFloat(obterElemento("peso").value);
    const idade = parseFloat(obterElemento("idade").value);

    if (isNaN(altura) || isNaN(peso) || isNaN(idade) || altura <= 0 || peso <= 0 || idade <= 0) {
        escrever("pesoIdeal", "Preencha corretamente.");
        escrever("imc", "—");
        escrever("classificacao", "—");
        escrever("recomendacao", "—");
        escrever("ritmoSaudavel", "—");
        escrever("tempoEstimado", "—");
        obterElemento("planoReceitaWrap").classList.add("hidden");
        return;
    }

    const pesoIdeal = generoSelecionado === "homem" ? (72.7 * altura) - 58 : (62.1 * altura) - 44.7;
    const imc = peso / (altura * altura);

    let classificacao = "Adequado";
    if (idade < 20 || idade > 65) classificacao = "Válido para idades entre os 20 e os 65 anos";
    else if (imc < 16) classificacao = "Magreza Grau III";
    else if (imc < 17) classificacao = "Magreza Grau II";
    else if (imc < 18.5) classificacao = "Magreza Grau I";
    else if (imc < 25) classificacao = "Adequado";
    else if (imc < 30) classificacao = "Pré-Obeso";
    else if (imc < 35) classificacao = "Obesidade Grau I";
    else if (imc < 40) classificacao = "Obesidade Grau II";
    else classificacao = "Obesidade Grau III";

    const diferenca = peso - pesoIdeal;
    const diferencaAbs = Math.abs(diferenca);

    let recomendacao = "Manter hábitos saudáveis.";
    let precisaPerder = false;

    if (idade >= 20 && idade <= 65) {
        if (diferencaAbs <= 2) {
            recomendacao = "O seu peso está próximo do peso ideal. Recomenda-se manter hábitos de vida saudáveis.";
        } else if (diferenca > 2) {
            precisaPerder = true;
            recomendacao = `O seu peso está acima do ideal. Recomenda-se perder cerca de ${formatarNumero(diferencaAbs, 2)} kg.`;
        } else {
            recomendacao = `O seu peso está abaixo do ideal. Recomenda-se ganhar cerca de ${formatarNumero(diferencaAbs, 2)} kg.`;
        }
    }

    escrever("pesoIdeal", `${formatarNumero(pesoIdeal, 2)} kg`);
    escrever("imc", formatarNumero(imc, 2));
    escrever("classificacao", classificacao);
    escrever("recomendacao", recomendacao);

    if (precisaPerder) {
        const semanas = Math.ceil(diferencaAbs / 0.5);
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
   REDES
========================= */
const redeState = {
    baseNetworkInt: null,
    baseCidr: null,
    currentIpInt: null,
    currentMaskInt: null,
    currentIpText: "",
    currentMaskText: "",
    subnetMode: "subnets",
    lastSubnetRows: [],
    enteredLocation: "—"
};

function preencherCIDROptions() {
    const select = obterElemento("cidrSelect");
    let html = '<option value="">Escolha</option>';
    for (let i = 1; i <= 32; i++) {
        html += `<option value="${i}">/${i}</option>`;
    }
    select.innerHTML = html;

    select.value = "24";
    setMaskFromCIDR(24);
}

function bindOctetInput(id) {
    const input = obterElemento(id);
    if (!input) return;

    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 3);
        if (input.value !== "" && Number(input.value) > 255) {
            input.value = "255";
        }
        input.classList.remove("invalid");
        esconderErroRede("networkError");
        if (id.startsWith("mask")) atualizarCIDRApartirMascara();
    });
}

function bindOnlyIntegers(id) {
    const input = obterElemento(id);
    if (!input) return;
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "");
    });
}

function getOctets(prefix) {
    return [1, 2, 3, 4].map(i => obterElemento(`${prefix}${i}`).value.trim());
}

function clearInvalidOctets(prefix) {
    [1, 2, 3, 4].forEach(i => obterElemento(`${prefix}${i}`).classList.remove("invalid"));
}

function markInvalid(prefix, index) {
    obterElemento(`${prefix}${index}`).classList.add("invalid");
}

function parseIPv4FromPrefix(prefix, labelTipo = "IP") {
    clearInvalidOctets(prefix);
    const valores = getOctets(prefix);

    if (valores.some(v => v === "")) {
        return { ok: false, erro: labelTipo === "IP" ? "O IP tem de ter 4 partes." : "A máscara introduzida não é válida." };
    }

    const octs = [];
    for (let i = 0; i < 4; i++) {
        if (!/^\d+$/.test(valores[i])) {
            markInvalid(prefix, i + 1);
            return { ok: false, erro: labelTipo === "IP" ? "Cada campo do IP só pode conter números." : "A máscara só pode conter números." };
        }

        const n = Number(valores[i]);
        if (n < 0 || n > 255) {
            markInvalid(prefix, i + 1);
            return {
                ok: false,
                erro: labelTipo === "IP"
                    ? `O valor ${n} não é válido, porque cada octeto do IP só pode ir de 0 a 255.`
                    : "Cada octeto da máscara deve estar entre 0 e 255."
            };
        }

        octs.push(n);
    }

    return { ok: true, octets: octs, text: octs.join(".") };
}

function ipv4ToInt(octets) {
    return (((octets[0] << 24) >>> 0) + ((octets[1] << 16) >>> 0) + ((octets[2] << 8) >>> 0) + (octets[3] >>> 0)) >>> 0;
}

function intToIPv4(int) {
    return [
        (int >>> 24) & 255,
        (int >>> 16) & 255,
        (int >>> 8) & 255,
        int & 255
    ].join(".");
}

function intMaskToBinary(maskInt) {
    return maskInt.toString(2).padStart(32, "0");
}

function maskOctetsToCIDR(octets) {
    const maskInt = ipv4ToInt(octets);
    const bits = intMaskToBinary(maskInt);
    if (!/^1*0*$/.test(bits)) return null;
    return bits.indexOf("0") === -1 ? 32 : bits.indexOf("0");
}

function cidrToMaskInt(cidr) {
    if (cidr === 0) return 0;
    return (0xFFFFFFFF << (32 - cidr)) >>> 0;
}

function cidrToMaskOctets(cidr) {
    const int = cidrToMaskInt(cidr);
    return [
        (int >>> 24) & 255,
        (int >>> 16) & 255,
        (int >>> 8) & 255,
        int & 255
    ];
}

function setMaskFromCIDR(cidr) {
    const octs = cidrToMaskOctets(Number(cidr));
    [1, 2, 3, 4].forEach((n, idx) => {
        obterElemento(`mask${n}`).value = octs[idx];
    });
}

function atualizarCIDRApartirMascara() {
    const parsed = parseIPv4FromPrefix("mask", "Máscara");
    if (!parsed.ok) return;
    const cidr = maskOctetsToCIDR(parsed.octets);
    if (cidr === null) return;
    obterElemento("cidrSelect").value = String(cidr);
}

function classificarIP(octs) {
    const a = octs[0];
    let classe = "—";

    if (a >= 1 && a <= 126) classe = "A";
    else if (a >= 128 && a <= 191) classe = "B";
    else if (a >= 192 && a <= 223) classe = "C";
    else if (a >= 224 && a <= 239) classe = "D";
    else if (a >= 240 && a <= 255) classe = "E";

    const ipInt = ipv4ToInt(octs);

    let categoria = "Público";
    let tipo = "Endereço normal";

    if (ipInt === 0xFFFFFFFF) {
        categoria = "Reservado";
        tipo = "Broadcast";
    } else if (a === 10 || (a === 172 && octs[1] >= 16 && octs[1] <= 31) || (a === 192 && octs[1] === 168)) {
        categoria = "Privado";
        tipo = "Endereço privado";
    } else if (a === 127) {
        categoria = "Reservado";
        tipo = "Loopback";
    } else if (a === 169 && octs[1] === 254) {
        categoria = "Reservado";
        tipo = "Link-local";
    } else if (a >= 224 && a <= 239) {
        categoria = "Reservado";
        tipo = "Multicast";
    } else if (a >= 240 || a === 0) {
        categoria = "Reservado";
        tipo = "Reservado";
    }

    return { classe, categoria, tipo };
}

function usableHostsByCIDR(cidr) {
    if (cidr >= 31) return 0;
    return Math.pow(2, 32 - cidr) - 2;
}

function showErroRede(targetId, msg) {
    const el = obterElemento(targetId);
    el.textContent = msg;
    el.classList.remove("hidden");
}

function esconderErroRede(targetId) {
    const el = obterElemento(targetId);
    el.textContent = "";
    el.classList.add("hidden");
}

function mostrarMensagemColarIp(texto) {
    const wrap = obterElemento("ipPasteMessage");
    const txt = obterElemento("ipPasteMessageText");
    txt.textContent = texto;
    wrap.classList.remove("hidden");
}

function fecharMensagemColarIp() {
    const wrap = obterElemento("ipPasteMessage");
    const txt = obterElemento("ipPasteMessageText");
    txt.textContent = "";
    wrap.classList.add("hidden");
}

function validarIPv4Texto(texto) {
    const limpo = String(texto || "").trim();

    if (!limpo) {
        return { ok: false, erro: "O clipboard está vazio." };
    }

    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(limpo)) {
        return { ok: false, erro: "O conteúdo copiado não está no formato IPv4 correto." };
    }

    const partes = limpo.split(".");
    const octetos = partes.map(Number);

    for (let i = 0; i < octetos.length; i++) {
        if (Number.isNaN(octetos[i]) || octetos[i] < 0 || octetos[i] > 255) {
            return { ok: false, erro: "O IPv4 copiado contém octetos inválidos. Cada parte deve estar entre 0 e 255." };
        }
    }

    return { ok: true, octetos, texto: limpo };
}

async function colarIpDoClipboard() {
    fecharMensagemColarIp();

    if (!navigator.clipboard || !navigator.clipboard.readText) {
        mostrarMensagemColarIp("O browser não permitiu aceder ao clipboard.");
        return;
    }

    try {
        const texto = await navigator.clipboard.readText();
        const validacao = validarIPv4Texto(texto);

        if (!validacao.ok) {
            mostrarMensagemColarIp(validacao.erro);
            return;
        }

        validacao.octetos.forEach((valor, idx) => {
            obterElemento(`ip${idx + 1}`).value = String(valor);
            obterElemento(`ip${idx + 1}`).classList.remove("invalid");
        });

        mostrarMensagemColarIp(`IPv4 colado com sucesso: ${validacao.texto}`);
    } catch {
        mostrarMensagemColarIp("Não foi possível ler o clipboard. Verifique as permissões do browser.");
    }
}

function separarBitsPorOctetos(bits32) {
    return bits32.match(/.{1,8}/g);
}

function gerarLinhaBinariaColorida(bits32, cidr) {
    const octetos = separarBitsPorOctetos(bits32);
    let html = "";
    let contadorBits = 0;

    octetos.forEach((octeto, indiceOcteto) => {
        for (let i = 0; i < octeto.length; i++) {
            const bitAtual = contadorBits + i;
            const classe = bitAtual < cidr ? "net-part" : "host-part";
            html += `<span class="${classe}">${octeto[i]}</span>`;
        }

        contadorBits += octeto.length;

        if (indiceOcteto < octetos.length - 1) {
            html += ` <span class="host-part">.</span> `;
        }
    });

    return html;
}

function formatarInteiroComEspacos(numero) {
    return Number(numero).toLocaleString("pt-PT");
}

function gerarExplicacaoRedeHTML() {
    if (redeState.baseNetworkInt === null || redeState.baseCidr === null) {
        return `<p class="note">Calcule primeiro a rede para ver a explicação.</p>`;
    }

    const cidr = redeState.baseCidr;
    const networkInt = redeState.baseNetworkInt;
    const networkText = intToIPv4(networkInt);
    const maskInt = cidrToMaskInt(cidr);
    const maskText = cidrToMaskOctets(cidr).join(".");

    const networkBits = networkInt.toString(2).padStart(32, "0");
    const maskBits = maskInt.toString(2).padStart(32, "0");

    const networkBitsColoridos = gerarLinhaBinariaColorida(networkBits, cidr);
    const maskBitsColoridos = gerarLinhaBinariaColorida(maskBits, cidr);

    const bitsRede = cidr;
    const bitsHosts = 32 - cidr;
    const redesPossiveis = Math.pow(2, bitsRede);
    const ipsTotais = Math.pow(2, bitsHosts);
    const hostsUtilizaveis = cidr >= 31 ? 0 : ipsTotais - 2;

    const textoHostsUtilizaveis = cidr >= 31
        ? "Nesta máscara não existem hosts utilizáveis."
        : `Os hosts utilizáveis são <span class="explanation-highlight">2<sup>${bitsHosts}</sup> − 2 = ${formatarInteiroComEspacos(hostsUtilizaveis)}</span>.`;

    const detalheHost = cidr >= 31
        ? `<ul>
                <li>Em /31 e /32 não existe a regra clássica de hosts utilizáveis para uma rede comum.</li>
           </ul>`
        : `<ul>
                <li><strong>1 endereço</strong> é o <strong>Network ID</strong>.</li>
                <li><strong>1 endereço</strong> é o <strong>Broadcast</strong>.</li>
           </ul>`;

    return `
        <h4>Explicação passo a passo da rede /${cidr}</h4>

        <div class="explanation-hero">
            <div class="binary-block">
                <div class="binary-label">Binário da rede</div>
                <div class="binary-line">${networkBitsColoridos}</div>
                <div class="decimal-line">= ${networkText}</div>
            </div>

            <div class="binary-block">
                <div class="binary-label">Binário da máscara</div>
                <div class="binary-line">${maskBitsColoridos}</div>
                <div class="decimal-line">= ${maskText}</div>
            </div>
        </div>

        <div class="explanation-grid">
            <div class="explanation-step">
                <strong>1. Separação entre rede e hosts</strong>
                <p>A máscara separa a parte da <span class="explanation-highlight">rede</span> da parte dos <span class="explanation-highlight">hosts</span>.</p>
            </div>

            <div class="explanation-step">
                <strong>2. Bits da rede</strong>
                <p>Os <span class="explanation-highlight">${bitsRede} primeiros bits</span> são 1 na máscara, por isso pertencem à rede.</p>
            </div>

            <div class="explanation-step">
                <strong>3. Bits dos hosts</strong>
                <p>Os <span class="explanation-highlight">${bitsHosts} bits seguintes</span> são 0 na máscara, por isso pertencem aos hosts.</p>
            </div>

            <div class="explanation-step">
                <strong>4. Redes possíveis</strong>
                <p><span class="explanation-highlight">2<sup>${bitsRede}</sup> = ${formatarInteiroComEspacos(redesPossiveis)}</span> redes possíveis.</p>
            </div>

            <div class="explanation-step">
                <strong>5. IPs totais nesta rede</strong>
                <p><span class="explanation-highlight">2<sup>${bitsHosts}</sup> = ${formatarInteiroComEspacos(ipsTotais)}</span> IPs no total dentro desta rede.</p>
            </div>

            <div class="explanation-step">
                <strong>6. Hosts utilizáveis</strong>
                <p>${textoHostsUtilizaveis}</p>
                ${detalheHost}
            </div>

            <div class="explanation-step full">
                <strong>7. Leitura visual</strong>
                <p>
                    Na linha binária da <span class="explanation-highlight">rede</span> e na linha binária da <span class="explanation-highlight">máscara</span>,
                    a parte destacada mostra exatamente a zona reservada à rede. A parte restante corresponde aos hosts.
                    Assim fica mais fácil perceber como o CIDR /${cidr} divide o endereço.
                </p>
            </div>
        </div>
    `;
}

function atualizarExplicacaoRede() {
    const conteudo = obterElemento("explicacaoRedeConteudo");
    if (conteudo) {
        conteudo.innerHTML = gerarExplicacaoRedeHTML();
    }
}

function alternarExplicacaoRede() {
    const wrap = obterElemento("explicacaoRedeWrap");
    const vaiAbrir = wrap.classList.contains("hidden");

    if (vaiAbrir) {
        atualizarExplicacaoRede();
        wrap.classList.remove("hidden");
    } else {
        wrap.classList.add("hidden");
    }
}

function calcularRede() {
    esconderErroRede("networkError");
    esconderErroRede("networkSpecialMessage");
    esconderErroRede("subnetError");

    const parsedIp = parseIPv4FromPrefix("ip", "IP");
    if (!parsedIp.ok) {
        showErroRede("networkError", parsedIp.erro || "O IP introduzido não é válido.");
        return;
    }

    const parsedMask = parseIPv4FromPrefix("mask", "Máscara");
    if (!parsedMask.ok) {
        showErroRede("networkError", parsedMask.erro || "A máscara introduzida não é válida.");
        return;
    }

    const cidr = maskOctetsToCIDR(parsedMask.octets);
    if (cidr === null) {
        showErroRede("networkError", "A máscara IPv4 deve ter bits consecutivos a 1 seguidos de bits a 0.");
        return;
    }

    obterElemento("cidrSelect").value = String(cidr);

    const ipInt = ipv4ToInt(parsedIp.octets);
    const maskInt = ipv4ToInt(parsedMask.octets);
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;
    const hosts = usableHostsByCIDR(cidr);

    let firstHost = "—";
    let lastHost = "—";

    if (hosts > 0) {
        firstHost = intToIPv4(networkInt + 1);
        lastHost = intToIPv4(broadcastInt - 1);
    }

    const info = classificarIP(parsedIp.octets);

    redeState.baseNetworkInt = networkInt;
    redeState.baseCidr = cidr;
    redeState.currentIpInt = ipInt;
    redeState.currentMaskInt = maskInt;
    redeState.currentIpText = parsedIp.text;
    redeState.currentMaskText = parsedMask.text;
    redeState.lastSubnetRows = [];

    escrever("netEstado", "IP válido.");
    escrever("netClasse", info.classe);
    escrever("netCategoria", info.categoria);
    escrever("netTipo", info.tipo);
    escrever("netAddress", intToIPv4(networkInt));
    escrever("broadcastAddress", intToIPv4(broadcastInt));
    escrever("firstHost", firstHost);
    escrever("lastHost", lastHost);
    escrever("usableHosts", String(hosts));
    escrever("maskCidrInfo", `${parsedMask.text} /${cidr}`);

    obterElemento("networkAnalysis").classList.remove("hidden");
    obterElemento("networkResults").classList.remove("hidden");
    obterElemento("subnetSection").classList.remove("hidden");
    obterElemento("subnetTableWrap").classList.add("hidden");
    obterElemento("subnetSummary").classList.add("hidden");
    obterElemento("subnetSummary").innerHTML = "";
    obterElemento("subnetTableWrap").innerHTML = "";
    obterElemento("explicacaoRedeWrap").classList.add("hidden");
    atualizarExplicacaoRede();

    let aviso = "";
    if (ipInt === networkInt) aviso = "O IP introduzido corresponde ao endereço de rede.";
    else if (ipInt === broadcastInt) aviso = "O IP introduzido corresponde ao endereço de broadcast.";
    else if (hosts === 0) aviso = "Esta sub-rede não tem hosts utilizáveis.";

    if (aviso) showErroRede("networkSpecialMessage", aviso);
    else esconderErroRede("networkSpecialMessage");
}

function limparExercicioRede() {
    ["ip1", "ip2", "ip3", "ip4", "mask1", "mask2", "mask3", "mask4", "wantedSubnets", "wantedHosts"].forEach(id => {
        const el = obterElemento(id);
        if (el) {
            el.value = "";
            el.classList.remove("invalid");
        }
    });

    fecharMensagemColarIp();

    obterElemento("cidrSelect").value = "24";
    setMaskFromCIDR(24);

    esconderErroRede("networkError");
    esconderErroRede("networkSpecialMessage");
    esconderErroRede("subnetError");

    ["networkAnalysis", "networkResults", "subnetSection", "subnetSummary", "subnetTableWrap", "explicacaoRedeWrap"].forEach(id => {
        const el = obterElemento(id);
        if (el) el.classList.add("hidden");
    });

    obterElemento("subnetSummary").innerHTML = "";
    obterElemento("subnetTableWrap").innerHTML = "";
    obterElemento("explicacaoRedeConteudo").innerHTML = "";
    obterElemento("vlsmRows").innerHTML = "";
    gerarSetoresVLSM();

    redeState.baseNetworkInt = null;
    redeState.baseCidr = null;
    redeState.currentIpInt = null;
    redeState.currentMaskInt = null;
    redeState.currentIpText = "";
    redeState.currentMaskText = "";
    redeState.lastSubnetRows = [];
    redeState.enteredLocation = "—";
}

async function copiarTexto(texto, sucesso = "Copiado.") {
    try {
        await navigator.clipboard.writeText(texto);
        alert(sucesso);
    } catch {
        alert("Não foi possível copiar.");
    }
}

function copiarInfoRede() {
    if (redeState.baseNetworkInt === null) {
        alert("Ainda não existe informação calculada.");
        return;
    }

    const texto = [
        `IP: ${redeState.currentIpText}`,
        `Máscara/CIDR: ${redeState.currentMaskText} /${redeState.baseCidr}`,
        `Classe: ${obterElemento("netClasse").textContent}`,
        `Tipo: ${obterElemento("netTipo").textContent}`,
        `Network: ${obterElemento("netAddress").textContent}`,
        `Broadcast: ${obterElemento("broadcastAddress").textContent}`,
        `Primeiro host: ${obterElemento("firstHost").textContent}`,
        `Último host: ${obterElemento("lastHost").textContent}`,
        `Número de hosts: ${obterElemento("usableHosts").textContent}`
    ].join("\n");

    copiarTexto(texto, "Informação da rede copiada.");
}

function selecionarModoSubnet(modo) {
    redeState.subnetMode = modo;

    obterElemento("modeSubnets").classList.toggle("toggle-active", modo === "subnets");
    obterElemento("modeHosts").classList.toggle("toggle-active", modo === "hosts");
    obterElemento("modeVlsm").classList.toggle("toggle-active", modo === "vlsm");

    obterElemento("subnetModeSubnets").classList.toggle("hidden", modo !== "subnets");
    obterElemento("subnetModeHosts").classList.toggle("hidden", modo !== "hosts");
    obterElemento("subnetModeVlsm").classList.toggle("hidden", modo !== "vlsm");
}

function tamanhoSubnet(cidr) {
    return Math.pow(2, 32 - cidr);
}

function linhaSubnet(nome, hostsPedidos, networkInt, cidr) {
    const size = tamanhoSubnet(cidr);
    const broadcastInt = networkInt + size - 1;
    const hostsDisp = usableHostsByCIDR(cidr);
    const temHosts = hostsDisp > 0;

    return {
        nome,
        hostsPedidos,
        hostsDisponiveis: hostsDisp,
        cidr: `/${cidr}`,
        mascara: cidrToMaskOctets(cidr).join("."),
        network: intToIPv4(networkInt),
        primeiro: temHosts ? intToIPv4(networkInt + 1) : "—",
        ultimo: temHosts ? intToIPv4(broadcastInt - 1) : "—",
        broadcast: intToIPv4(broadcastInt)
    };
}

function resumoRowsComLimite(rows) {
    if (rows.length <= 50) return rows;
    return [...rows.slice(0, 10), ...rows.slice(-10)];
}

function renderTabelaSubnet(rows, tituloExtra = "") {
    redeState.lastSubnetRows = rows.slice();

    let resumo = tituloExtra;
    let rowsToRender = rows;

    if (rows.length > 50) {
        rowsToRender = resumoRowsComLimite(rows);
        resumo += `<br>Existem ${rows.length} resultados no total. São mostrados apenas os primeiros 10 e os últimos 10.`;
    }

    if (resumo) {
        obterElemento("subnetSummary").innerHTML = `<div class="result-item"><strong>Resumo</strong><span>${resumo}</span></div>`;
        obterElemento("subnetSummary").classList.remove("hidden");
    } else {
        obterElemento("subnetSummary").innerHTML = "";
        obterElemento("subnetSummary").classList.add("hidden");
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Sub-rede / Setor</th>
                    <th>Hosts pedidos</th>
                    <th>Hosts disponíveis</th>
                    <th>CIDR</th>
                    <th>Máscara</th>
                    <th>Network</th>
                    <th>Primeiro Host</th>
                    <th>Último Host</th>
                    <th>Broadcast</th>
                </tr>
            </thead>
            <tbody>
                ${rowsToRender.map(r => `
                    <tr>
                        <td>${r.nome}</td>
                        <td>${r.hostsPedidos ?? "—"}</td>
                        <td>${r.hostsDisponiveis}</td>
                        <td>${r.cidr}</td>
                        <td>${r.mascara}</td>
                        <td>${r.network}</td>
                        <td>${r.primeiro}</td>
                        <td>${r.ultimo}</td>
                        <td>${r.broadcast}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    obterElemento("subnetTableWrap").innerHTML = html;
    obterElemento("subnetTableWrap").classList.remove("hidden");
}

function calcularSubnetting() {
    esconderErroRede("subnetError");

    if (redeState.baseNetworkInt === null || redeState.baseCidr === null) {
        showErroRede("subnetError", "Calcule primeiro a rede base.");
        return;
    }

    if (redeState.subnetMode === "subnets") calcularModoSubredes();
    else if (redeState.subnetMode === "hosts") calcularModoHosts();
    else calcularModoVLSM();
}

function calcularModoSubredes() {
    const valor = obterElemento("wantedSubnets").value.trim();
    if (valor === "") {
        showErroRede("subnetError", "Indique o número de sub-redes pretendido.");
        return;
    }
    if (!/^\d+$/.test(valor)) {
        showErroRede("subnetError", "Só são permitidos números inteiros.");
        return;
    }

    const wanted = Number(valor);
    if (wanted <= 0) {
        showErroRede("subnetError", "O número de sub-redes tem de ser superior a zero.");
        return;
    }

    const addedBits = Math.ceil(Math.log2(wanted));
    const newCidr = redeState.baseCidr + addedBits;

    if (newCidr > 32) {
        showErroRede("subnetError", "A rede introduzida não suporta essa quantidade de sub-redes.");
        return;
    }

    const totalPossiveis = Math.pow(2, addedBits);
    const size = tamanhoSubnet(newCidr);
    const rows = [];

    for (let i = 0; i < wanted; i++) {
        rows.push(linhaSubnet(`Sub-rede ${i + 1}`, "—", redeState.baseNetworkInt + (i * size), newCidr));
    }

    renderTabelaSubnet(rows, `CIDR resultante: /${newCidr} | Sub-redes possíveis: ${totalPossiveis} | Hosts por sub-rede: ${usableHostsByCIDR(newCidr)}`);
}

function calcularModoHosts() {
    const valor = obterElemento("wantedHosts").value.trim();
    if (valor === "") {
        showErroRede("subnetError", "Indique o número de hosts pretendido.");
        return;
    }
    if (!/^\d+$/.test(valor)) {
        showErroRede("subnetError", "Só são permitidos números inteiros.");
        return;
    }

    const wanted = Number(valor);
    if (wanted <= 0) {
        showErroRede("subnetError", "O número de hosts deve ser superior a zero.");
        return;
    }

    let hostBits = 2;
    while ((Math.pow(2, hostBits) - 2) < wanted && hostBits <= 32) hostBits++;
    const newCidr = 32 - hostBits;

    if (newCidr < redeState.baseCidr) {
        showErroRede("subnetError", "A rede não tem endereços suficientes para suportar esse número de hosts por sub-rede.");
        return;
    }

    const subnetCount = Math.pow(2, newCidr - redeState.baseCidr);
    const size = tamanhoSubnet(newCidr);
    const rows = [];

    for (let i = 0; i < subnetCount; i++) {
        rows.push(linhaSubnet(`Sub-rede ${i + 1}`, wanted, redeState.baseNetworkInt + (i * size), newCidr));
    }

    renderTabelaSubnet(rows, `Máscara ideal: ${cidrToMaskOctets(newCidr).join(".")} | CIDR resultante: /${newCidr} | Quantidade de sub-redes possíveis: ${subnetCount}`);
}

function gerarSetoresVLSM() {
    const count = Number(obterElemento("sectorCount").value || 1);
    const wrap = obterElemento("vlsmRows");
    let html = "";

    for (let i = 1; i <= count; i++) {
        html += `
            <div class="vlsm-row">
                <span>Setor ${i}</span>
                <input type="text" class="vlsm-name" id="sectorName${i}" placeholder="Nome opcional do setor">
                <input type="text" class="vlsm-hosts" id="sectorHosts${i}" inputmode="numeric" placeholder="Hosts">
            </div>
        `;
    }

    wrap.innerHTML = html;

    for (let i = 1; i <= count; i++) {
        const el = obterElemento(`sectorHosts${i}`);
        el.addEventListener("input", () => {
            el.value = el.value.replace(/\D/g, "");
        });
    }
}

function cidrParaHostsNecessarios(hosts) {
    let bits = 2;
    while ((Math.pow(2, bits) - 2) < hosts && bits <= 32) bits++;
    return 32 - bits;
}

function calcularModoVLSM() {
    const count = Number(obterElemento("sectorCount").value || 1);
    const setores = [];

    for (let i = 1; i <= count; i++) {
        const name = obterElemento(`sectorName${i}`).value.trim() || `Setor ${i}`;
        const hostsTexto = obterElemento(`sectorHosts${i}`).value.trim();

        if (hostsTexto === "") {
            showErroRede("subnetError", `O setor ${i} não tem número de hosts preenchido.`);
            return;
        }
        if (!/^\d+$/.test(hostsTexto)) {
            showErroRede("subnetError", "Os hosts de cada setor devem ser números inteiros.");
            return;
        }

        const hosts = Number(hostsTexto);
        if (hosts <= 0) {
            showErroRede("subnetError", "O número de hosts deve ser superior a zero.");
            return;
        }

        setores.push({
            nome: name,
            hostsPedidos: hosts,
            cidr: cidrParaHostsNecessarios(hosts)
        });
    }

    setores.sort((a, b) => a.cidr - b.cidr);

    let current = redeState.baseNetworkInt;
    const baseEnd = redeState.baseNetworkInt + tamanhoSubnet(redeState.baseCidr) - 1;
    const rows = [];

    for (const setor of setores) {
        if (setor.cidr < redeState.baseCidr) {
            showErroRede("subnetError", "A rede base não tem capacidade suficiente para todos os setores.");
            return;
        }

        const size = tamanhoSubnet(setor.cidr);
        if ((current + size - 1) > baseEnd) {
            showErroRede("subnetError", "A rede base não tem capacidade suficiente para todos os setores.");
            return;
        }

        rows.push(linhaSubnet(setor.nome, setor.hostsPedidos, current, setor.cidr));
        current += size;
    }

    renderTabelaSubnet(rows, "VLSM calculado com sucesso.");
}

function copiarResultadosSubnet() {
    if (!redeState.lastSubnetRows.length) {
        alert("Ainda não existem resultados de subnetting.");
        return;
    }

    const texto = redeState.lastSubnetRows.map(r =>
        `${r.nome} | Hosts pedidos: ${r.hostsPedidos ?? "—"} | Hosts disponíveis: ${r.hostsDisponiveis} | ${r.cidr} | Máscara: ${r.mascara} | Network: ${r.network} | Primeiro: ${r.primeiro} | Último: ${r.ultimo} | Broadcast: ${r.broadcast}`
    ).join("\n");

    copiarTexto(texto, "Resultados de subnetting copiados.");
}

/* =========================
   ESTADO DA LIGAÇÃO
========================= */
function abrirSpeedtest() {
    window.open("https://www.speedtest.net/pt", "_blank", "noopener,noreferrer");
}

/* =========================
   INIT EVENTS
========================= */
["ip1", "ip2", "ip3", "ip4", "mask1", "mask2", "mask3", "mask4"].forEach(bindOctetInput);
["wantedSubnets", "wantedHosts"].forEach(bindOnlyIntegers);

obterElemento("cidrSelect").addEventListener("change", (e) => {
    if (e.target.value !== "") {
        setMaskFromCIDR(Number(e.target.value));
        esconderErroRede("networkError");
    }
});

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

["coefA", "coefB", "coefC"].forEach(id => {
    const el = obterElemento(id);
    if (el) {
        el.addEventListener("focus", () => definirCoefAtivo(id));
    }
});

/* =========================
   INIT
========================= */
preencherCIDROptions();
gerarSetoresVLSM();
atualizarMemoriasVisuais();
definirCampoAtivo("v1");
definirModoAngular("graus");
esconderMensagemOperacoes();
selecionarGenero("mulher");
selecionarModoNotas("media");
selecionarEscalaNotas(100);