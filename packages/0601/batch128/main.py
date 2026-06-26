import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime
from database import (
    init_db, migrate_db, add_material, get_all_materials, update_material, delete_material,
    add_transaction, get_transactions, get_low_stock_materials, search_materials,
    get_material_by_barcode, export_monthly_report, MATERIAL_TYPES
)


class PotteryInventoryApp:
    def __init__(self, root):
        self.root = root
        self.root.title("陶艺工作室库存管理系统")
        self.root.geometry("1400x800")

        self.operator = tk.StringVar(value="店员1")
        self.search_keyword = tk.StringVar()
        self.filter_type = tk.StringVar(value="全部")
        self.client_id = tk.StringVar(value="前台机")

        self.create_widgets()
        self.refresh_materials()
        self.check_low_stock()

    def create_widgets(self):
        top_frame = ttk.Frame(self.root, padding="10")
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="操作员:").pack(side=tk.LEFT, padx=5)
        operator_combo = ttk.Combobox(
            top_frame,
            textvariable=self.operator,
            values=["店员1", "店员2", "店员3"],
            state="readonly",
            width=10
        )
        operator_combo.pack(side=tk.LEFT, padx=5)

        ttk.Label(top_frame, text="机器:").pack(side=tk.LEFT, padx=(20, 5))
        client_combo = ttk.Combobox(
            top_frame,
            textvariable=self.client_id,
            values=["前台机", "仓库机", "窑炉机"],
            state="readonly",
            width=10
        )
        client_combo.pack(side=tk.LEFT, padx=5)

        ttk.Label(top_frame, text="搜索:").pack(side=tk.LEFT, padx=(20, 5))
        search_entry = ttk.Entry(top_frame, textvariable=self.search_keyword, width=20)
        search_entry.pack(side=tk.LEFT, padx=5)
        search_entry.bind('<KeyRelease>', lambda e: self.refresh_materials())

        ttk.Label(top_frame, text="类型:").pack(side=tk.LEFT, padx=(20, 5))
        type_combo = ttk.Combobox(
            top_frame,
            textvariable=self.filter_type,
            values=["全部"] + MATERIAL_TYPES,
            state="readonly",
            width=10
        )
        type_combo.pack(side=tk.LEFT, padx=5)
        type_combo.bind('<<ComboboxSelected>>', lambda e: self.refresh_materials())

        ttk.Button(top_frame, text="条码出库", command=self.barcode_out_dialog).pack(side=tk.RIGHT, padx=5)
        ttk.Button(top_frame, text="导出月报", command=self.export_report_dialog).pack(side=tk.RIGHT, padx=5)
        ttk.Button(top_frame, text="新增物料", command=self.add_material_dialog).pack(side=tk.RIGHT, padx=5)
        ttk.Button(top_frame, text="出入库记录", command=self.show_transactions_dialog).pack(side=tk.RIGHT, padx=5)

        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        columns = ("id", "type", "name", "quantity", "unit", "threshold", "barcode", "batch", "firing_temp", "updated_at")
        self.tree = ttk.Treeview(main_frame, columns=columns, show="headings")

        self.tree.heading("id", text="ID")
        self.tree.heading("type", text="类型")
        self.tree.heading("name", text="名称")
        self.tree.heading("quantity", text="当前库存")
        self.tree.heading("unit", text="单位")
        self.tree.heading("threshold", text="预警值")
        self.tree.heading("barcode", text="条码")
        self.tree.heading("batch", text="批次号")
        self.tree.heading("firing_temp", text="烧制温度")
        self.tree.heading("updated_at", text="更新时间")

        self.tree.column("id", width=50, anchor=tk.CENTER)
        self.tree.column("type", width=70, anchor=tk.CENTER)
        self.tree.column("name", width=140)
        self.tree.column("quantity", width=80, anchor=tk.CENTER)
        self.tree.column("unit", width=60, anchor=tk.CENTER)
        self.tree.column("threshold", width=70, anchor=tk.CENTER)
        self.tree.column("barcode", width=100)
        self.tree.column("batch", width=100)
        self.tree.column("firing_temp", width=80, anchor=tk.CENTER)
        self.tree.column("updated_at", width=140, anchor=tk.CENTER)

        scrollbar = ttk.Scrollbar(main_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=scrollbar.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        btn_frame = ttk.Frame(self.root, padding="10")
        btn_frame.pack(fill=tk.X)

        ttk.Button(btn_frame, text="入库", command=self.stock_in_dialog).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="出库", command=self.stock_out_dialog).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="编辑物料", command=self.edit_material_dialog).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="删除物料", command=self.delete_material_confirm).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="刷新", command=self.refresh_materials).pack(side=tk.RIGHT, padx=5)

        self.low_stock_label = ttk.Label(self.root, text="", foreground="red", padding="5")
        self.low_stock_label.pack(fill=tk.X)

    def refresh_materials(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        keyword = self.search_keyword.get()
        material_type = self.filter_type.get()

        materials = search_materials(keyword, material_type)

        for mat in materials:
            values = (
                mat['id'],
                mat['material_type'],
                mat['name'],
                mat['quantity'],
                mat['unit'],
                mat['low_stock_threshold'],
                mat.get('barcode') or '',
                mat.get('batch_number') or '',
                mat.get('firing_temp') or '',
                mat['updated_at']
            )
            item = self.tree.insert('', tk.END, values=values)

            if mat['low_stock_threshold'] > 0 and mat['quantity'] <= mat['low_stock_threshold']:
                self.tree.item(item, tags=('low_stock',))

        self.tree.tag_configure('low_stock', background='#ffcccc')
        self.check_low_stock()

    def check_low_stock(self):
        low_stock = get_low_stock_materials()
        if low_stock:
            names = [f"{m['name']}({m['quantity']}{m['unit']})" for m in low_stock]
            self.low_stock_label.config(text=f"⚠️ 低库存提醒: {', '.join(names)}")
        else:
            self.low_stock_label.config(text="")

    def get_selected_material(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择一条物料记录")
            return None
        return self.tree.item(selected[0])['values']

    def add_material_dialog(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("新增物料")
        dialog.geometry("450x480")
        dialog.transient(self.root)
        dialog.grab_set()

        ttk.Label(dialog, text="物料类型:").pack(pady=(15, 5))
        type_var = tk.StringVar(value=MATERIAL_TYPES[0])
        type_combo = ttk.Combobox(dialog, textvariable=type_var, values=MATERIAL_TYPES, state="readonly", width=35)
        type_combo.pack()

        ttk.Label(dialog, text="物料名称:").pack(pady=(10, 5))
        name_var = tk.StringVar()
        name_entry = ttk.Entry(dialog, textvariable=name_var, width=38)
        name_entry.pack()

        ttk.Label(dialog, text="单位:").pack(pady=(10, 5))
        unit_var = tk.StringVar(value="kg")
        unit_entry = ttk.Entry(dialog, textvariable=unit_var, width=38)
        unit_entry.pack()

        ttk.Label(dialog, text="低库存预警值:").pack(pady=(10, 5))
        threshold_var = tk.StringVar(value="0")
        threshold_entry = ttk.Entry(dialog, textvariable=threshold_var, width=38)
        threshold_entry.pack()

        ttk.Label(dialog, text="商品条码:").pack(pady=(10, 5))
        barcode_var = tk.StringVar()
        barcode_entry = ttk.Entry(dialog, textvariable=barcode_var, width=38)
        barcode_entry.pack()

        ttk.Label(dialog, text="批次号:").pack(pady=(10, 5))
        batch_var = tk.StringVar()
        batch_entry = ttk.Entry(dialog, textvariable=batch_var, width=38)
        batch_entry.pack()

        ttk.Label(dialog, text="烧制温度(℃):").pack(pady=(10, 5))
        temp_var = tk.StringVar()
        temp_entry = ttk.Entry(dialog, textvariable=temp_var, width=38)
        temp_entry.pack()

        def save():
            name = name_var.get().strip()
            unit = unit_var.get().strip()
            try:
                threshold = float(threshold_var.get())
            except ValueError:
                messagebox.showerror("错误", "预警值必须是数字")
                return

            firing_temp = None
            if temp_var.get().strip():
                try:
                    firing_temp = float(temp_var.get())
                except ValueError:
                    messagebox.showerror("错误", "烧制温度必须是数字")
                    return

            if not name:
                messagebox.showerror("错误", "请输入物料名称")
                return
            if not unit:
                messagebox.showerror("错误", "请输入单位")
                return

            add_material(name, type_var.get(), unit, threshold,
                        barcode_var.get().strip(), batch_var.get().strip(),
                        firing_temp)
            self.refresh_materials()
            dialog.destroy()
            messagebox.showinfo("成功", "物料添加成功")

        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(pady=20)
        ttk.Button(btn_frame, text="保存", command=save).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=10)

    def edit_material_dialog(self):
        values = self.get_selected_material()
        if not values:
            return

        mat_id, mat_type, mat_name, mat_qty, mat_unit, mat_threshold, mat_barcode, mat_batch, mat_temp, _ = values

        mat = get_material_by_id(mat_id)

        dialog = tk.Toplevel(self.root)
        dialog.title("编辑物料")
        dialog.geometry("450x480")
        dialog.transient(self.root)
        dialog.grab_set()

        ttk.Label(dialog, text="物料类型:").pack(pady=(15, 5))
        type_var = tk.StringVar(value=mat_type)
        type_combo = ttk.Combobox(dialog, textvariable=type_var, values=MATERIAL_TYPES, state="readonly", width=35)
        type_combo.pack()
        type_combo.config(state=tk.DISABLED)

        ttk.Label(dialog, text="物料名称:").pack(pady=(10, 5))
        name_var = tk.StringVar(value=mat_name)
        name_entry = ttk.Entry(dialog, textvariable=name_var, width=38)
        name_entry.pack()

        ttk.Label(dialog, text="单位:").pack(pady=(10, 5))
        unit_var = tk.StringVar(value=mat_unit)
        unit_entry = ttk.Entry(dialog, textvariable=unit_var, width=38)
        unit_entry.pack()

        ttk.Label(dialog, text="低库存预警值:").pack(pady=(10, 5))
        threshold_var = tk.StringVar(value=str(mat_threshold))
        threshold_entry = ttk.Entry(dialog, textvariable=threshold_var, width=38)
        threshold_entry.pack()

        ttk.Label(dialog, text="商品条码:").pack(pady=(10, 5))
        barcode_var = tk.StringVar(value=mat.get('barcode') or '')
        barcode_entry = ttk.Entry(dialog, textvariable=barcode_var, width=38)
        barcode_entry.pack()

        ttk.Label(dialog, text="批次号:").pack(pady=(10, 5))
        batch_var = tk.StringVar(value=mat.get('batch_number') or '')
        batch_entry = ttk.Entry(dialog, textvariable=batch_var, width=38)
        batch_entry.pack()

        ttk.Label(dialog, text="烧制温度(℃):").pack(pady=(10, 5))
        temp_var = tk.StringVar(value=str(mat.get('firing_temp')) if mat.get('firing_temp') else '')
        temp_entry = ttk.Entry(dialog, textvariable=temp_var, width=38)
        temp_entry.pack()

        def save():
            name = name_var.get().strip()
            unit = unit_var.get().strip()
            try:
                threshold = float(threshold_var.get())
            except ValueError:
                messagebox.showerror("错误", "预警值必须是数字")
                return

            firing_temp = None
            if temp_var.get().strip():
                try:
                    firing_temp = float(temp_var.get())
                except ValueError:
                    messagebox.showerror("错误", "烧制温度必须是数字")
                    return

            if not name:
                messagebox.showerror("错误", "请输入物料名称")
                return
            if not unit:
                messagebox.showerror("错误", "请输入单位")
                return

            update_material(mat_id, name, unit, threshold,
                           barcode_var.get().strip(), batch_var.get().strip(),
                           firing_temp)
            self.refresh_materials()
            dialog.destroy()
            messagebox.showinfo("成功", "物料更新成功")

        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(pady=20)
        ttk.Button(btn_frame, text="保存", command=save).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=10)

    def delete_material_confirm(self):
        values = self.get_selected_material()
        if not values:
            return

        mat_name = values[2]
        if messagebox.askyesno("确认删除", f"确定要删除物料「{mat_name}」吗？\n相关出入库记录也会被删除。"):
            delete_material(values[0])
            self.refresh_materials()
            messagebox.showinfo("成功", "物料已删除")

    def stock_in_dialog(self):
        self.stock_transaction_dialog("入库")

    def stock_out_dialog(self):
        self.stock_transaction_dialog("出库")

    def stock_transaction_dialog(self, trans_type, material_id=None):
        if material_id is None:
            values = self.get_selected_material()
            if not values:
                return
            mat_id = values[0]
            mat_name = values[2]
            mat_qty = values[3]
            mat_unit = values[4]
            mat_batch = values[7]
            mat_temp = values[8]
        else:
            mat = get_material_by_id(material_id)
            if not mat:
                return
            mat_id = mat['id']
            mat_name = mat['name']
            mat_qty = mat['quantity']
            mat_unit = mat['unit']
            mat_batch = mat.get('batch_number') or ''
            mat_temp = mat.get('firing_temp') or ''

        dialog = tk.Toplevel(self.root)
        dialog.title(f"{trans_type} - {mat_name}")
        dialog.geometry("450x380")
        dialog.transient(self.root)
        dialog.grab_set()

        ttk.Label(dialog, text=f"物料: {mat_name}").pack(pady=(20, 5))
        ttk.Label(dialog, text=f"当前库存: {mat_qty} {mat_unit}").pack(pady=5)

        ttk.Label(dialog, text=f"{trans_type}数量:").pack(pady=(15, 5))
        qty_var = tk.StringVar(value="1")
        qty_entry = ttk.Entry(dialog, textvariable=qty_var, width=38)
        qty_entry.pack()

        ttk.Label(dialog, text="批次号:").pack(pady=(10, 5))
        batch_var = tk.StringVar(value=mat_batch)
        batch_entry = ttk.Entry(dialog, textvariable=batch_var, width=38)
        batch_entry.pack()

        ttk.Label(dialog, text="烧制温度(℃):").pack(pady=(10, 5))
        temp_var = tk.StringVar(value=str(mat_temp) if mat_temp else '')
        temp_entry = ttk.Entry(dialog, textvariable=temp_var, width=38)
        temp_entry.pack()

        ttk.Label(dialog, text="备注:").pack(pady=(10, 5))
        note_var = tk.StringVar()
        note_entry = ttk.Entry(dialog, textvariable=note_var, width=38)
        note_entry.pack()

        def confirm():
            try:
                qty = float(qty_var.get())
            except ValueError:
                messagebox.showerror("错误", "请输入有效的数量")
                return

            if qty <= 0:
                messagebox.showerror("错误", "数量必须大于0")
                return

            firing_temp = None
            if temp_var.get().strip():
                try:
                    firing_temp = float(temp_var.get())
                except ValueError:
                    messagebox.showerror("错误", "烧制温度必须是数字")
                    return

            try:
                add_transaction(mat_id, trans_type, qty, self.operator.get(),
                              note_var.get(), batch_number=batch_var.get().strip(),
                              firing_temp=firing_temp, client_id=self.client_id.get())
                self.refresh_materials()
                dialog.destroy()
                messagebox.showinfo("成功", f"{trans_type}成功")
            except ValueError as e:
                messagebox.showerror("错误", str(e))

        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(pady=20)
        ttk.Button(btn_frame, text="确认", command=confirm).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=10)

    def barcode_out_dialog(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("条码快速出库")
        dialog.geometry("500x450")
        dialog.transient(self.root)
        dialog.grab_set()

        ttk.Label(dialog, text="扫描商品条码:", font=('Arial', 14)).pack(pady=(20, 10))
        barcode_var = tk.StringVar()
        barcode_entry = ttk.Entry(dialog, textvariable=barcode_var, width=40, font=('Arial', 14))
        barcode_entry.pack(pady=5)
        barcode_entry.focus_set()

        info_frame = ttk.LabelFrame(dialog, text="商品信息", padding="10")
        info_frame.pack(fill=tk.X, padx=20, pady=15)

        self.barcode_mat_name = ttk.Label(info_frame, text="请扫描条码", font=('Arial', 12))
        self.barcode_mat_name.pack(anchor=tk.W)
        self.barcode_mat_stock = ttk.Label(info_frame, text="")
        self.barcode_mat_stock.pack(anchor=tk.W, pady=(5, 0))
        self.barcode_mat_batch = ttk.Label(info_frame, text="")
        self.barcode_mat_batch.pack(anchor=tk.W, pady=(2, 0))
        self.barcode_mat_temp = ttk.Label(info_frame, text="")
        self.barcode_mat_temp.pack(anchor=tk.W, pady=(2, 0))

        self.current_barcode_mat_id = None

        ttk.Label(dialog, text="出库数量:").pack(pady=(5, 5))
        qty_var = tk.StringVar(value="1")
        qty_entry = ttk.Entry(dialog, textvariable=qty_var, width=40)
        qty_entry.pack()

        def on_scan(event=None):
            barcode = barcode_var.get().strip()
            if not barcode:
                return
            mat = get_material_by_barcode(barcode)
            if mat:
                self.current_barcode_mat_id = mat['id']
                self.barcode_mat_name.config(text=f"商品: {mat['name']}")
                self.barcode_mat_stock.config(text=f"库存: {mat['quantity']} {mat['unit']}")
                self.barcode_mat_batch.config(text=f"批次: {mat.get('batch_number') or '-'}")
                self.barcode_mat_temp.config(text=f"烧制温度: {mat.get('firing_temp') or '-'}℃")
                qty_entry.focus_set()
                qty_entry.select_range(0, tk.END)
            else:
                self.current_barcode_mat_id = None
                self.barcode_mat_name.config(text="❌ 未找到该条码对应的商品")
                self.barcode_mat_stock.config(text="")
                self.barcode_mat_batch.config(text="")
                self.barcode_mat_temp.config(text="")
                messagebox.showwarning("提示", "未找到该条码对应的商品")

        barcode_entry.bind('<Return>', on_scan)

        def confirm_out():
            if not self.current_barcode_mat_id:
                messagebox.showwarning("提示", "请先扫描有效的商品条码")
                return
            try:
                qty = float(qty_var.get())
            except ValueError:
                messagebox.showerror("错误", "请输入有效的数量")
                return
            if qty <= 0:
                messagebox.showerror("错误", "数量必须大于0")
                return

            try:
                add_transaction(self.current_barcode_mat_id, "出库", qty,
                              self.operator.get(), scan_barcode=barcode_var.get().strip(),
                              client_id=self.client_id.get())
                self.refresh_materials()
                barcode_var.set("")
                qty_var.set("1")
                self.current_barcode_mat_id = None
                self.barcode_mat_name.config(text="请扫描条码")
                self.barcode_mat_stock.config(text="")
                self.barcode_mat_batch.config(text="")
                self.barcode_mat_temp.config(text="")
                barcode_entry.focus_set()
                messagebox.showinfo("成功", "出库成功")
            except ValueError as e:
                messagebox.showerror("错误", str(e))

        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(pady=20)
        ttk.Button(btn_frame, text="查询", command=on_scan).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="确认出库", command=confirm_out).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="关闭", command=dialog.destroy).pack(side=tk.LEFT, padx=10)

    def export_report_dialog(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("导出月报表")
        dialog.geometry("400x250")
        dialog.transient(self.root)
        dialog.grab_set()

        now = datetime.now()
        ttk.Label(dialog, text="选择月份:").pack(pady=(30, 10))

        year_var = tk.StringVar(value=str(now.year))
        month_var = tk.StringVar(value=str(now.month))

        ym_frame = ttk.Frame(dialog)
        ym_frame.pack(pady=5)
        ttk.Label(ym_frame, text="年:").pack(side=tk.LEFT, padx=5)
        year_combo = ttk.Combobox(ym_frame, textvariable=year_var,
                                values=[str(y) for y in range(now.year - 5, now.year + 1)],
                                width=8, state="readonly")
        year_combo.pack(side=tk.LEFT, padx=5)
        ttk.Label(ym_frame, text="月:").pack(side=tk.LEFT, padx=5)
        month_combo = ttk.Combobox(ym_frame, textvariable=month_var,
                                  values=[str(m) for m in range(1, 13)],
                                  width=6, state="readonly")
        month_combo.pack(side=tk.LEFT, padx=5)

        def do_export():
            year = int(year_var.get())
            month = int(month_var.get())
            default_name = f"库存月报_{year}年{month}月.csv"
            filepath = filedialog.asksaveasfilename(
                title="保存月报表",
                defaultextension=".csv",
                initialfile=default_name,
                filetypes=[("CSV文件", "*.csv")]
            )
            if not filepath:
                return
            try:
                export_monthly_report(year, month, filepath)
                dialog.destroy()
                messagebox.showinfo("成功", f"报表已导出到:\n{filepath}")
            except Exception as e:
                messagebox.showerror("错误", f"导出失败: {str(e)}")

        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(pady=30)
        ttk.Button(btn_frame, text="导出", command=do_export).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=10)

    def show_transactions_dialog(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("出入库记录")
        dialog.geometry("1000x550")
        dialog.transient(self.root)

        columns = ("id", "name", "type", "qty", "operator", "batch", "temp", "client", "note", "time")
        tree = ttk.Treeview(dialog, columns=columns, show="headings")

        tree.heading("id", text="ID")
        tree.heading("name", text="物料名称")
        tree.heading("type", text="类型")
        tree.heading("qty", text="数量")
        tree.heading("operator", text="操作员")
        tree.heading("batch", text="批次号")
        tree.heading("temp", text="烧制温度")
        tree.heading("client", text="操作机器")
        tree.heading("note", text="备注")
        tree.heading("time", text="时间")

        tree.column("id", width=50, anchor=tk.CENTER)
        tree.column("name", width=150)
        tree.column("type", width=70, anchor=tk.CENTER)
        tree.column("qty", width=70, anchor=tk.CENTER)
        tree.column("operator", width=80, anchor=tk.CENTER)
        tree.column("batch", width=100)
        tree.column("temp", width=80, anchor=tk.CENTER)
        tree.column("client", width=80, anchor=tk.CENTER)
        tree.column("note", width=150)
        tree.column("time", width=140, anchor=tk.CENTER)

        scrollbar = ttk.Scrollbar(dialog, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscroll=scrollbar.set)

        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, pady=10)

        transactions = get_transactions()
        for t in transactions:
            tree.insert('', tk.END, values=(
                t['id'],
                t['material_name'],
                t['transaction_type'],
                t['quantity'],
                t['operator'],
                t.get('batch_number') or '',
                t.get('firing_temp') or '',
                t.get('client_id') or '',
                t['note'] or '',
                t['created_at']
            ))


if __name__ == "__main__":
    init_db()
    migrate_db()
    root = tk.Tk()
    app = PotteryInventoryApp(root)
    root.mainloop()
