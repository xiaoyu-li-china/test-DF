<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import {
  Home,
  User,
  Building2,
  Mail,
  Hash,
  Calendar,
  CreditCard,
  ArrowRight,
  Loader2,
  Receipt,
  Building,
  Landmark,
} from 'lucide-vue-next'
import { useInputScroll } from '@/composables/useInputScroll'
import { fetchOrders, submitInvoice } from '@/mock/api'
import { createInvoiceSchema } from '@/utils/validation'
import type { OrderItem, InvoiceFormValues } from '@/types'

const router = useRouter()
const { scrollIntoView } = useInputScroll()

const orders = ref<OrderItem[]>([])
const loading = ref(false)
const submitting = ref(false)

const schema = createInvoiceSchema()

const { handleSubmit, values } = useForm<InvoiceFormValues>({
  validationSchema: schema,
  initialValues: {
    titleType: 'personal',
    invoiceType: 'normal',
    taxId: '',
    bankName: '',
    bankAccount: '',
    email: '',
    orderId: '',
    amount: 0,
  },
})

const selectedOrder = computed(() =>
  orders.value.find((o) => o.id === values.orderId)
)

const showBankInfo = computed(
  () => values.titleType === 'enterprise' && values.invoiceType === 'special'
)

const {
  value: titleType,
  errorMessage: titleTypeError,
  setValue: setTitleType,
} = useField<InvoiceFormValues['titleType']>('titleType')

const {
  value: invoiceType,
  errorMessage: invoiceTypeError,
  setValue: setInvoiceType,
} = useField<InvoiceFormValues['invoiceType']>('invoiceType')

const {
  value: taxId,
  errorMessage: taxIdError,
  meta: taxIdMeta,
} = useField<InvoiceFormValues['taxId']>('taxId')

const {
  value: bankName,
  errorMessage: bankNameError,
  meta: bankNameMeta,
} = useField<InvoiceFormValues['bankName']>('bankName')

const {
  value: bankAccount,
  errorMessage: bankAccountError,
  meta: bankAccountMeta,
} = useField<InvoiceFormValues['bankAccount']>('bankAccount')

const {
  value: email,
  errorMessage: emailError,
  meta: emailMeta,
} = useField<InvoiceFormValues['email']>('email')

const {
  value: orderId,
  errorMessage: orderIdError,
  setValue: setOrderId,
} = useField<InvoiceFormValues['orderId']>('orderId')

const {
  value: amount,
  setValue: setAmount,
} = useField<InvoiceFormValues['amount']>('amount')

const taxIdInputRef = ref<HTMLInputElement | null>(null)
const emailInputRef = ref<HTMLInputElement | null>(null)
const bankNameInputRef = ref<HTMLInputElement | null>(null)
const bankAccountInputRef = ref<HTMLInputElement | null>(null)

const selectTitleType = (type: 'personal' | 'enterprise') => {
  setTitleType(type)
  if (type === 'enterprise') {
    setTimeout(() => {
      taxIdInputRef.value?.focus()
    }, 100)
  }
}

const selectInvoiceType = (type: 'normal' | 'special') => {
  setInvoiceType(type)
  if (type === 'special' && values.titleType === 'enterprise') {
    setTimeout(() => {
      bankNameInputRef.value?.focus()
    }, 100)
  }
}

const selectOrder = (order: OrderItem) => {
  setOrderId(order.id)
  setAmount(order.amount)
}

const onTaxIdFocus = () => {
  scrollIntoView(taxIdInputRef.value, 300)
}

const onEmailFocus = () => {
  scrollIntoView(emailInputRef.value, 300)
}

const onBankNameFocus = () => {
  scrollIntoView(bankNameInputRef.value, 300)
}

const onBankAccountFocus = () => {
  scrollIntoView(bankAccountInputRef.value, 300)
}

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  try {
    const response = await submitInvoice({
      titleType: values.titleType,
      invoiceType: values.invoiceType,
      taxId: values.titleType === 'enterprise' ? values.taxId : undefined,
      bankName: showBankInfo.value ? values.bankName : undefined,
      bankAccount: showBankInfo.value ? values.bankAccount : undefined,
      email: values.email,
      orderId: values.orderId,
      amount: values.amount,
    })
    router.push({
      path: '/result',
      query: {
        message: response.message,
        estimatedDays: response.estimatedDays,
        applicationNo: response.applicationNo,
        pdfUrl: response.pdfUrl,
        email: values.email,
      },
    })
  } finally {
    submitting.value = false
  }
})

onMounted(async () => {
  loading.value = true
  try {
    orders.value = await fetchOrders()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-inn-cream">
    <header class="bg-inn-brown text-white px-6 py-8 animate-fade-in-up">
      <div class="max-w-lg mx-auto">
        <div class="flex items-center gap-3 mb-2">
          <Home class="w-7 h-7" />
          <h1 class="font-serif-sc text-2xl font-bold">民宿电子发票</h1>
        </div>
        <p class="text-white/80 text-sm">填写信息，我们将为您开具电子发票</p>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-6 safe-bottom">
      <form @submit.prevent="onSubmit" class="space-y-6">
        <section class="bg-white rounded-2xl p-5 shadow-sm animate-fade-in-up delay-100">
          <h2 class="font-serif-sc text-lg font-semibold text-inn-dark mb-4 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-inn-brown/10 text-inn-brown rounded-full flex items-center justify-center text-sm font-bold"
              >1</span
            >
            选择抬头类型
          </h2>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="selectTitleType('personal')"
              class="p-4 rounded-xl border-2 transition-all duration-200 text-left"
              :class="
                titleType === 'personal'
                  ? 'border-inn-brown bg-inn-brown/5'
                  : 'border-gray-200 hover:border-inn-brown-light'
              "
            >
              <User
                class="w-6 h-6 mb-2"
                :class="titleType === 'personal' ? 'text-inn-brown' : 'text-gray-400'"
              />
              <div class="font-medium text-inn-dark">个人</div>
              <div class="text-xs text-gray-500 mt-1">无需税号</div>
            </button>
            <button
              type="button"
              @click="selectTitleType('enterprise')"
              class="p-4 rounded-xl border-2 transition-all duration-200 text-left"
              :class="
                titleType === 'enterprise'
                  ? 'border-inn-brown bg-inn-brown/5'
                  : 'border-gray-200 hover:border-inn-brown-light'
              "
            >
              <Building2
                class="w-6 h-6 mb-2"
                :class="titleType === 'enterprise' ? 'text-inn-brown' : 'text-gray-400'"
              />
              <div class="font-medium text-inn-dark">企业</div>
              <div class="text-xs text-gray-500 mt-1">需填税号</div>
            </button>
          </div>
          <div v-if="titleTypeError" class="mt-2 text-sm text-red-500">{{ titleTypeError }}</div>
        </section>

        <section
          v-if="titleType === 'enterprise'"
          class="bg-white rounded-2xl p-5 shadow-sm animate-fade-in-up delay-200"
        >
          <h2 class="font-serif-sc text-lg font-semibold text-inn-dark mb-4 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-inn-brown/10 text-inn-brown rounded-full flex items-center justify-center text-sm font-bold"
              >2</span
            >
            发票类型
          </h2>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="selectInvoiceType('normal')"
              class="p-4 rounded-xl border-2 transition-all duration-200 text-left"
              :class="
                invoiceType === 'normal'
                  ? 'border-inn-brown bg-inn-brown/5'
                  : 'border-gray-200 hover:border-inn-brown-light'
              "
            >
              <Receipt
                class="w-6 h-6 mb-2"
                :class="invoiceType === 'normal' ? 'text-inn-brown' : 'text-gray-400'"
              />
              <div class="font-medium text-inn-dark">普票</div>
              <div class="text-xs text-gray-500 mt-1">增值税普通发票</div>
            </button>
            <button
              type="button"
              @click="selectInvoiceType('special')"
              class="p-4 rounded-xl border-2 transition-all duration-200 text-left"
              :class="
                invoiceType === 'special'
                  ? 'border-inn-brown bg-inn-brown/5'
                  : 'border-gray-200 hover:border-inn-brown-light'
              "
            >
              <Building
                class="w-6 h-6 mb-2"
                :class="invoiceType === 'special' ? 'text-inn-brown' : 'text-gray-400'"
              />
              <div class="font-medium text-inn-dark">专票</div>
              <div class="text-xs text-gray-500 mt-1">增值税专用发票</div>
            </button>
          </div>
        </section>

        <section
          v-if="titleType === 'enterprise'"
          class="bg-white rounded-2xl p-5 shadow-sm animate-fade-in-up delay-300"
        >
          <h2 class="font-serif-sc text-lg font-semibold text-inn-dark mb-4 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-inn-brown/10 text-inn-brown rounded-full flex items-center justify-center text-sm font-bold"
            >
              {{ invoiceType === 'special' ? '3' : '2' }}
            </span>
            企业税号
          </h2>
          <div class="relative">
            <Hash class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref="taxIdInputRef"
              v-model="taxId"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              placeholder="请输入18位统一社会信用代码"
              @focus="onTaxIdFocus"
              class="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-xl text-base outline-none transition-colors"
              :class="
                taxIdMeta.touched && taxIdError
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-inn-brown'
              "
            />
          </div>
          <div v-if="taxIdMeta.touched && taxIdError" class="mt-2 text-sm text-red-500">
            {{ taxIdError }}
          </div>
        </section>

        <section
          v-if="showBankInfo"
          class="bg-white rounded-2xl p-5 shadow-sm animate-fade-in-up"
        >
          <h2 class="font-serif-sc text-lg font-semibold text-inn-dark mb-4 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-inn-brown/10 text-inn-brown rounded-full flex items-center justify-center text-sm font-bold"
              >4</span
            >
            开户银行信息
          </h2>
          <div class="space-y-4">
            <div class="relative">
              <Landmark class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref="bankNameInputRef"
                v-model="bankName"
                type="text"
                autocomplete="off"
                autocapitalize="off"
                placeholder="请填写开户银行"
                @focus="onBankNameFocus"
                class="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-xl text-base outline-none transition-colors"
                :class="
                  bankNameMeta.touched && bankNameError
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-inn-brown'
                "
              />
            </div>
            <div v-if="bankNameMeta.touched && bankNameError" class="text-sm text-red-500">
              {{ bankNameError }}
            </div>

            <div class="relative">
              <CreditCard class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref="bankAccountInputRef"
                v-model="bankAccount"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                autocapitalize="off"
                placeholder="请填写银行账号"
                @focus="onBankAccountFocus"
                class="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-xl text-base outline-none transition-colors"
                :class="
                  bankAccountMeta.touched && bankAccountError
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-inn-brown'
                "
              />
            </div>
            <div v-if="bankAccountMeta.touched && bankAccountError" class="text-sm text-red-500">
              {{ bankAccountError }}
            </div>
          </div>
        </section>

        <section class="bg-white rounded-2xl p-5 shadow-sm animate-fade-in-up delay-400">
          <h2 class="font-serif-sc text-lg font-semibold text-inn-dark mb-4 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-inn-brown/10 text-inn-brown rounded-full flex items-center justify-center text-sm font-bold"
            >
              {{ titleType === 'personal' ? '2' : invoiceType === 'special' ? '5' : '3' }}
            </span>
            接收邮箱
          </h2>
          <div class="relative">
            <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref="emailInputRef"
              v-model="email"
              type="email"
              autocomplete="email"
              autocapitalize="off"
              placeholder="请输入接收发票的邮箱"
              @focus="onEmailFocus"
              class="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-xl text-base outline-none transition-colors"
              :class="
                emailMeta.touched && emailError
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-inn-brown'
              "
            />
          </div>
          <div v-if="emailMeta.touched && emailError" class="mt-2 text-sm text-red-500">
            {{ emailError }}
          </div>
          <p class="mt-2 text-xs text-gray-500">电子发票将发送至此邮箱，请确保邮箱正确</p>
        </section>

        <section class="bg-white rounded-2xl p-5 shadow-sm animate-fade-in-up">
          <h2 class="font-serif-sc text-lg font-semibold text-inn-dark mb-4 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-inn-brown/10 text-inn-brown rounded-full flex items-center justify-center text-sm font-bold"
            >
              {{ titleType === 'personal' ? '3' : invoiceType === 'special' ? '6' : '4' }}
            </span>
            选择入住订单
          </h2>
          <div v-if="loading" class="flex justify-center py-6">
            <Loader2 class="w-6 h-6 text-inn-brown animate-spin" />
          </div>
          <div v-else class="space-y-3">
            <button
              v-for="order in orders"
              :key="order.id"
              type="button"
              @click="selectOrder(order)"
              class="w-full p-4 rounded-xl border-2 transition-all duration-200 text-left"
              :class="
                orderId === order.id
                  ? 'border-inn-brown bg-inn-brown/5'
                  : 'border-gray-200 hover:border-inn-brown-light'
              "
            >
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <CreditCard
                    class="w-5 h-5"
                    :class="orderId === order.id ? 'text-inn-brown' : 'text-gray-400'"
                  />
                  <span class="font-medium text-inn-dark">房间 {{ order.roomNo }}</span>
                </div>
                <span class="text-lg font-bold text-inn-brown">¥{{ order.amount.toFixed(2) }}</span>
              </div>
              <div class="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar class="w-4 h-4" />
                <span>{{ order.checkIn }} 至 {{ order.checkOut }}</span>
              </div>
              <div class="text-sm text-gray-500 mt-1">入住人：{{ order.guestName }}</div>
            </button>
          </div>
          <div v-if="orderIdError" class="mt-2 text-sm text-red-500">{{ orderIdError }}</div>
        </section>

        <section
          v-if="selectedOrder"
          class="bg-inn-gold/10 rounded-2xl p-5 animate-fade-in-up delay-500"
        >
          <div class="text-sm text-inn-dark/70 mb-1">开票金额</div>
          <div class="text-4xl font-bold text-inn-brown font-serif-sc">
            ¥{{ selectedOrder.amount.toFixed(2) }}
          </div>
        </section>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full h-12 bg-inn-brown text-white rounded-xl font-medium text-base
                 hover:bg-inn-brown-dark active:bg-inn-brown-dark
                 disabled:bg-gray-300 disabled:cursor-not-allowed
                 transition-colors duration-200 flex items-center justify-center gap-2
                 min-h-[48px]"
        >
          <Loader2 v-if="submitting" class="w-5 h-5 animate-spin" />
          <template v-else>
            <span>提交申请</span>
            <ArrowRight class="w-5 h-5" />
          </template>
        </button>
      </form>
    </main>
  </div>
</template>
