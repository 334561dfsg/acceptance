<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconBuildingBank,
  IconCircleCheck,
  IconShieldCheck,
  IconTransfer,
  IconWallet,
} from "@tabler/icons-vue";
import BrandLogo from "../components/BrandLogo.vue";

const heading = ref<HTMLElement | null>(null);
onMounted(() => heading.value?.focus({ preventScroll: true }));
const steps = [
  {
    title: "开通企业服务",
    text: "提交企业、法人及受益人资料。服务申请须完成身份核验及业务审核。",
  },
  {
    title: "接收 USDT",
    text: "按账户支持的币种与网络创建收款订单，查询到账状态及可用余额。",
  },
  {
    title: "确认美元报价",
    text: "选择已审核的对公收款账户，核对当次报价、手续费与预计到账金额。",
  },
  {
    title: "追踪付款进度",
    text: "提交付款用途及所需材料，查询处理进度与付款记录。",
  },
];
const questions = [
  {
    title: "哪些企业适用？",
    text: "产品围绕香港企业的 USDT 收款及美元对公付款需求设计。服务资格需结合企业业务、所在地及适用要求审核；香港注册身份本身不代表符合准入条件。",
  },
  {
    title: "可以向第三方企业付款吗？",
    text: "第三方企业付款须在账户已开通的服务范围内进行，并完成收款账户审核。具体交易需符合业务用途及材料要求，可能需要补充合同、发票等证明。不支持个人收款账户。",
  },
  {
    title: "费用和到账时间如何确定？",
    text: "费用及汇率以当次有效报价和适用条款为准。预计到账金额及时间不构成保证；最终结果可能受到银行费用、链上确认、业务审核及银行处理安排影响。",
  },
  {
    title: "开通后会获得银行账户吗？",
    text: "工作台账户不等同于银行账户。添加收款账户是登记企业已有的对公银行账户，不代表新开立银行账户，也不代表任何银行对本产品提供担保。",
  },
];
</script>

<template>
  <div class="website">
    <a class="site-skip" href="#site-main">跳至正文</a>
    <header class="site-header site-container">
      <RouterLink to="/website" aria-label="Acceptance 官网"
        ><BrandLogo
      /></RouterLink>
      <nav class="site-nav" aria-label="官网导航">
        <a href="#how-it-works">结算流程</a><a href="#coverage">服务范围</a
        ><a href="#questions">常见问题</a>
      </nav>
      <RouterLink class="site-login" to="/login"
        >客户登录 <IconArrowUpRight :size="17" aria-hidden="true"
      /></RouterLink>
    </header>

    <main id="site-main">
      <section class="site-hero site-container" aria-labelledby="site-title">
        <div class="hero-copy">
          <p class="site-eyebrow">企业稳定币收款与美元结算</p>
          <h1 id="site-title" ref="heading" tabindex="-1">
            连接稳定币与美元，<br /><span>让企业收付款<br />更简单。</span>
          </h1>
          <p class="hero-intro">
            围绕 USDT 收款与美元对公付款，<br
              class="desktop-break"
            />在一个工作台内管理企业资料、兑换报价与付款订单。
          </p>
          <div class="site-actions">
            <RouterLink class="site-button" to="/login"
              >进入企业工作台 <IconArrowUpRight :size="19" aria-hidden="true"
            /></RouterLink>
            <a class="site-text-link" href="#how-it-works"
              >了解如何运作 <IconArrowRight :size="18" aria-hidden="true"
            /></a>
          </div>
          <p class="hero-note">
            服务须经申请及审核，具体范围以账户开通结果为准。
          </p>
        </div>
        <figure
          class="settlement-visual"
          aria-label="资金流程示意：企业 USDT 收款，确认兑换报价，再付款至经审核的美元对公账户"
        >
          <div class="visual-topline">
            <span>企业结算</span><span>流程示意</span>
          </div>
          <div class="money-source">
            <span class="currency-symbol">₮</span>
            <div><small>企业稳定币收入</small><strong>USDT</strong></div>
            <IconWallet :size="24" aria-hidden="true" />
          </div>
          <div class="transfer-line">
            <span></span>
            <p>收款到账 · 可用余额</p>
          </div>
          <div class="conversion-panel">
            <IconTransfer :size="25" aria-hidden="true" />
            <div>
              <strong>核对每一笔结算</strong>
              <p>兑换汇率 / 手续费 / 预计到账</p>
            </div>
            <IconCircleCheck :size="22" aria-hidden="true" />
          </div>
          <div class="transfer-line">
            <span></span>
            <p>确认报价 · 提交付款</p>
          </div>
          <div class="money-target">
            <div class="target-heading">
              <IconBuildingBank :size="27" aria-hidden="true" /><span
                >美元对公账户</span
              ><strong>USD</strong>
            </div>
            <div class="target-options">
              <span>本企业账户</span><span>经审核的第三方企业</span>
            </div>
          </div>
          <figcaption>
            <IconShieldCheck :size="16" aria-hidden="true" />
            企业认证与收款账户独立审核
          </figcaption>
        </figure>
      </section>

      <section
        id="coverage"
        class="coverage-section"
        aria-labelledby="coverage-title"
      >
        <div class="site-container coverage-inner">
          <h2 id="coverage-title">了解服务范围，<br />规划企业收付款。</h2>
          <dl class="coverage-list">
            <div>
              <dt>企业类型</dt>
              <dd>香港企业</dd>
            </div>
            <div>
              <dt>收款币种</dt>
              <dd>USDT</dd>
            </div>
            <div>
              <dt>付款币种</dt>
              <dd>USD 美元</dd>
            </div>
            <div>
              <dt>收款银行地区</dt>
              <dd>香港 / 美国</dd>
            </div>
          </dl>
        </div>
        <p class="site-container coverage-note">
          币种、网络、银行通道及付款用途受地区和账户资格限制，以实际开通服务为准；列示地区不表示该地区所有企业或银行均可使用。
        </p>
      </section>

      <section
        id="how-it-works"
        class="site-container workflow-section"
        aria-labelledby="workflow-title"
      >
        <div class="site-section-heading">
          <p class="site-eyebrow">从收款到付款</p>
          <h2 id="workflow-title">从企业认证到付款查询。</h2>
          <p>把企业资料、收款账户和每一笔订单连接起来。</p>
        </div>
        <ol class="workflow-list">
          <li v-for="(step, index) in steps" :key="step.title">
            <span class="step-number">0{{ index + 1 }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </li>
        </ol>
      </section>

      <section
        class="usecase-section site-container"
        aria-labelledby="usecase-title"
      >
        <div class="usecase-intro">
          <p class="site-eyebrow">企业付款场景</p>
          <h2 id="usecase-title">企业资金安排，<br />匹配不同付款需求。</h2>
          <p>
            集中管理本企业及第三方企业收款资料，让付款用途、收款账户与订单记录一一对应。
          </p>
          <a class="site-text-link" href="#questions"
            >查看服务说明 <IconArrowRight :size="18" aria-hidden="true"
          /></a>
        </div>
        <div class="usecase-items">
          <article>
            <IconBuildingBank :size="29" aria-hidden="true" />
            <h3>结算至本企业账户</h3>
            <p>
              选择已审核的本企业对公账户，核对美元结算报价，并查询对应付款订单。
            </p>
            <span>企业资金归集</span>
          </article>
          <article>
            <IconArrowUpRight :size="29" aria-hidden="true" />
            <h3>向业务伙伴付款</h3>
            <p>
              为经审核的供应商或服务商管理美元付款，关联业务用途与所需证明材料。交易须符合已开通服务的要求。
            </p>
            <span>第三方企业付款</span>
          </article>
        </div>
      </section>

      <section class="clarity-section" aria-labelledby="clarity-title">
        <div class="site-container clarity-inner">
          <div>
            <p class="site-eyebrow">集中展示订单信息</p>
            <h2 id="clarity-title">金额看得清，<br />进度跟得上。</h2>
          </div>
          <div class="clarity-points">
            <article>
              <h3>报价信息展示</h3>
              <p>
                支付金额、手续费、汇率与预计到账金额集中列示，便于提交前核对。报价有效期及具体费用以当次交易信息为准。
              </p>
            </article>
            <article>
              <h3>订单状态展示</h3>
              <p>
                分别管理收款与付款订单，查询处理状态、收款账户及到账记录。链上到账与银行到账为不同处理阶段。
              </p>
            </article>
            <article>
              <h3>审核流程展示</h3>
              <p>
                企业资料与收款账户分别审核。资料审核通过后，具体交易仍可能需要补充材料或接受进一步核查。
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        id="questions"
        class="site-container faq-section"
        aria-labelledby="faq-title"
      >
        <div class="site-section-heading">
          <p class="site-eyebrow">开始之前</p>
          <h2 id="faq-title">你可能想了解。</h2>
        </div>
        <div class="faq-list">
          <article v-for="question in questions" :key="question.title">
            <h3>{{ question.title }}</h3>
            <p>{{ question.text }}</p>
          </article>
        </div>
      </section>
      <section class="site-container final-cta" aria-labelledby="cta-title">
        <div>
          <h2 id="cta-title">企业收付款，<br />从清晰的管理开始。</h2>
          <p>在企业工作台查看账户信息、收款与付款订单。</p>
        </div>
        <RouterLink class="site-button" to="/login"
          >进入企业工作台 <IconArrowUpRight :size="20" aria-hidden="true"
        /></RouterLink>
      </section>
    </main>
    <footer class="site-footer site-container">
      <div class="footer-top">
        <BrandLogo /><RouterLink to="/"
          >返回入口页 <IconArrowUpRight :size="16" aria-hidden="true"
        /></RouterLink>
      </div>
      <p>
        服务可用性取决于适用法律、客户资格、业务审核及通道条件。具体服务内容和责任以与实际服务提供方签署的协议为准。USDT
        不等同于银行存款，涉及脱锚、发行人、网络及交易对手等风险。本页面不构成投资建议或收益承诺。
      </p>
      <small>© {{ new Date().getFullYear() }} Acceptance</small>
    </footer>
  </div>
</template>

<style scoped>
.website {
  background: #fff;
  color: #14283e;
  --site-blue: #245fe5;
  --site-muted: #5a6b7c;
  font-size: 15px;
  line-height: 1.7;
  overflow-wrap: break-word;
}
.site-container {
  width: min(1200px, calc(100% - 96px));
  margin-inline: auto;
}
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 100px;
  border-bottom: 1px solid #e6ebf0;
}
.site-header :deep(.brand),
.site-footer :deep(.brand) {
  color: #14283e;
  font-size: 25px;
}
.site-header :deep(.brand svg),
.site-footer :deep(.brand svg) {
  color: var(--site-blue);
}
.site-nav {
  display: flex;
  gap: 32px;
}
.site-nav a,
.site-login {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
.site-nav a:hover,
.site-text-link:hover,
.site-login:hover {
  color: var(--site-blue);
}
.site-login {
  font-weight: 600;
}
.site-skip {
  position: absolute;
  left: 20px;
  top: -100px;
  padding: 12px;
  background: #fff;
  z-index: 10;
}
.site-skip:focus {
  top: 12px;
}
.site-hero {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 70px;
  align-items: center;
  padding-block: 88px 96px;
}
.site-eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--site-blue);
  margin-bottom: 22px;
}
.hero-copy h1 {
  font-size: clamp(36px, 3.6vw, 52px);
  line-height: 1.22;
  letter-spacing: -2px;
  font-weight: 600;
}
.hero-copy h1 span {
  color: var(--site-blue);
}
.hero-copy h1:focus {
  outline: none;
}
.hero-intro {
  font-size: 17px;
  line-height: 1.9;
  margin-top: 28px;
  color: var(--site-muted);
}
.site-actions {
  display: flex;
  gap: 25px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 32px;
}
.site-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 22px;
  min-height: 52px;
  padding: 12px 22px;
  background: var(--site-blue);
  color: #fff;
  border-radius: 6px;
  font-weight: 600;
  transition: background 0.15s;
}
.site-button:hover {
  background: #194ab8;
}
.site-text-link {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  min-height: 44px;
  font-weight: 500;
}
.hero-note {
  font-size: 12px;
  color: var(--site-muted);
  margin-top: 20px;
}
.settlement-visual {
  margin: 0;
  background: #eef3fa;
  border: 1px solid #e0e8f2;
  border-radius: 16px;
  padding: 28px 32px 22px;
  transform: rotate(-2deg);
  box-shadow: 0 28px 70px -42px #27477266;
}
.visual-topline {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #607286;
  margin-bottom: 25px;
}
.money-source {
  background: white;
  border-radius: 10px;
  padding: 22px;
  display: flex;
  gap: 17px;
  align-items: center;
  border: 1px solid #dfe7f0;
}
.currency-symbol {
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #e8f6f1;
  color: #168567;
  width: 48px;
  height: 48px;
  font-size: 31px;
  font-weight: 600;
}
.money-source small {
  display: block;
  color: var(--site-muted);
  font-size: 12px;
}
.money-source strong {
  display: block;
  font-size: 28px;
  line-height: 1.3;
}
.money-source > svg {
  margin-left: auto;
  color: #64798f;
}
.transfer-line {
  display: flex;
  gap: 16px;
  align-items: center;
  padding-left: 45px;
  height: 60px;
  font-size: 11px;
  color: #5a6b7c;
}
.transfer-line span {
  height: 100%;
  border-left: 1px dashed #96abc5;
}
.conversion-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #245fe5;
  color: #fff;
  padding: 22px;
  border-radius: 10px;
}
.conversion-panel p {
  font-size: 11px;
  color: #edf2ff;
  margin-top: 4px;
}
.conversion-panel > svg:last-child {
  margin-left: auto;
  flex-shrink: 0;
}
.conversion-panel strong {
  font-size: 16px;
}
.money-target {
  background: white;
  padding: 23px;
  border: 1px solid #dfe7f0;
  border-radius: 10px;
}
.target-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}
.target-heading strong {
  margin-left: auto;
  font-size: 22px;
}
.target-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 19px;
}
.target-options span {
  font-size: 11px;
  background: #f1f4f8;
  padding: 4px 10px;
  border-radius: 4px;
  color: #52687b;
}
.settlement-visual figcaption {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #607286;
  font-size: 11px;
  margin-top: 23px;
}
.coverage-section {
  border-block: 1px solid #e5ebf2;
  padding: 34px 0 22px;
}
.coverage-inner {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 36px;
  align-items: center;
}
.coverage-inner h2 {
  font-size: 20px;
  line-height: 1.5;
  font-weight: 500;
  letter-spacing: 0;
}
.coverage-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin: 0;
}
.coverage-list dt {
  font-size: 12px;
  color: var(--site-muted);
  margin-bottom: 7px;
}
.coverage-list dd {
  font-size: 21px;
  font-weight: 500;
  margin: 0;
}
.coverage-note {
  font-size: 11px;
  color: var(--site-muted);
  margin-top: 20px;
}
.workflow-section {
  padding-block: 96px;
}
.site-section-heading h2,
.usecase-intro h2,
.clarity-inner h2,
.final-cta h2 {
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 550;
  letter-spacing: -1px;
  line-height: 1.4;
}
.site-section-heading > p:last-child {
  margin-top: 16px;
  color: var(--site-muted);
}
.site-section-heading .site-eyebrow {
  margin-bottom: 16px;
}
.workflow-list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
  padding: 0;
  margin: 48px 0 0;
}
.workflow-list li {
  border-top: 1px solid #cdd9e7;
  padding-top: 20px;
}
.step-number {
  font-size: 13px;
  color: var(--site-blue);
  font-variant-numeric: tabular-nums;
}
.workflow-list h3 {
  font-size: 18px;
  margin: 16px 0 10px;
  font-weight: 550;
}
.workflow-list p {
  font-size: 14px;
  color: var(--site-muted);
}
.usecase-section {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 80px;
  padding-block: 30px 100px;
  align-items: center;
}
.usecase-intro > p:not(.site-eyebrow) {
  max-width: 340px;
  margin: 24px 0;
  color: var(--site-muted);
}
.usecase-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.usecase-items article {
  padding: 28px 25px;
  background: #f3f6fa;
  border-radius: 8px;
}
.usecase-items svg {
  color: var(--site-blue);
  margin-bottom: 28px;
}
.usecase-items h3 {
  font-size: 19px;
  font-weight: 550;
  line-height: 1.5;
}
.usecase-items p {
  color: var(--site-muted);
  font-size: 14px;
  margin: 15px 0 28px;
}
.usecase-items span {
  font-size: 11px;
  color: #416284;
}
.clarity-section {
  background: #142c47;
  color: #fff;
  padding-block: 72px;
}
.clarity-inner {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 80px;
}
.clarity-section .site-eyebrow {
  color: #a9c3ff;
}
.clarity-points {
  display: grid;
  gap: 28px;
}
.clarity-points h3 {
  font-weight: 500;
  font-size: 19px;
  margin-bottom: 8px;
}
.clarity-points p {
  font-size: 14px;
  color: #c6d3e2;
  max-width: 470px;
}
.faq-section {
  padding-block: 90px;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 80px;
}
.faq-list article + article {
  margin-top: 28px;
}
.faq-list h3 {
  font-size: 17px;
  font-weight: 550;
  margin-bottom: 9px;
}
.faq-list p {
  font-size: 14px;
  color: var(--site-muted);
}
.final-cta {
  border-top: 1px solid #dfe7ee;
  padding-block: 60px 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
}
.final-cta p {
  color: var(--site-muted);
  margin-top: 16px;
}
.final-cta .site-button {
  flex-shrink: 0;
}
.site-footer {
  border-top: 1px solid #dfe7ee;
  padding-block: 30px;
}
.footer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.footer-top > a {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  font-size: 13px;
}
.site-footer > p {
  font-size: 11px;
  color: var(--site-muted);
  max-width: 760px;
  margin: 22px 0 12px;
}
.site-footer > small {
  font-size: 11px;
  color: var(--site-muted);
}
@media (max-width: 1050px) {
  .site-container {
    width: calc(100% - 64px);
  }
  .site-hero {
    gap: 35px;
  }
  .site-actions {
    gap: 12px;
  }
  .settlement-visual {
    padding: 22px;
  }
  .site-nav {
    gap: 20px;
  }
  .usecase-section,
  .clarity-inner,
  .faq-section {
    gap: 40px;
  }
  .usecase-section {
    grid-template-columns: 1fr;
  }
  .usecase-intro > p:not(.site-eyebrow) {
    max-width: 600px;
  }
  .coverage-inner {
    grid-template-columns: 1fr;
  }
  .workflow-list {
    gap: 22px;
  }
}
@media (max-width: 720px) {
  .site-container {
    width: calc(100% - 40px);
  }
  .site-header {
    flex-wrap: wrap;
    gap: 4px 16px;
    padding-block: 18px 10px;
    min-height: auto;
  }
  .site-header :deep(.brand) {
    font-size: 22px;
  }
  .site-nav {
    order: 3;
    width: 100%;
    justify-content: space-between;
    gap: 10px;
    font-size: 13px;
    margin-top: 10px;
  }
  .site-login {
    font-size: 13px;
  }
  .site-hero {
    grid-template-columns: 1fr;
    padding-block: 48px 55px;
    gap: 40px;
  }
  .hero-copy h1 {
    font-size: clamp(32px, 8.5vw, 44px);
  }
  .hero-intro {
    font-size: 15px;
  }
  .settlement-visual {
    transform: none;
    max-width: 520px;
    width: 100%;
    margin: auto;
  }
  .site-eyebrow {
    font-size: 12px;
  }
  .coverage-list {
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .coverage-list dd {
    font-size: 20px;
  }
  .workflow-section {
    padding-block: 58px;
  }
  .workflow-list {
    grid-template-columns: 1fr 1fr;
    gap: 30px 20px;
    margin-top: 30px;
  }
  .workflow-list h3 {
    font-size: 17px;
  }
  .usecase-section {
    padding-block: 10px 55px;
  }
  .usecase-items {
    grid-template-columns: 1fr;
  }
  .usecase-items article {
    padding: 26px;
  }
  .usecase-items svg {
    margin-bottom: 14px;
  }
  .usecase-items p {
    margin-bottom: 18px;
  }
  .clarity-section {
    padding-block: 50px;
  }
  .clarity-inner,
  .faq-section {
    grid-template-columns: 1fr;
    gap: 34px;
  }
  .faq-section {
    padding-block: 55px;
  }
  .final-cta {
    align-items: flex-start;
    flex-direction: column;
    padding-block: 40px 50px;
  }
  .footer-top {
    flex-wrap: wrap;
  }
  .desktop-break {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .site-button {
    transition: none;
  }
}
</style>
