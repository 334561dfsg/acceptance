<template>
  <main class="prototype-portal">
    <h1>选择入口</h1>
    <p>选择客户系统或管理后台，进入对应的系统。</p>
    <div class="prototype-entries">
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
