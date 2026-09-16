<template>
  <main class="prototype-portal">
    <h1>选择入口</h1>
    <p>了解 Acceptance，或进入客户系统与管理后台。</p>
    <div class="prototype-entries">
      <RouterLink to="/website"
        ><h2>官网</h2>
        <p>了解企业稳定币收款与美元结算</p></RouterLink
      >
      <RouterLink to="/login"
        ><h2>客户系统</h2>
        <p>U 收款、美元结算与订单记录</p></RouterLink
      >
      <RouterLink to="/admin"
        ><h2>管理后台</h2>
        <p>客户账户、安全维护与操作记录</p></RouterLink
      >
    </div>
  </main>
</template>
