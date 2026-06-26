import io
import dash
from dash import dcc, html, Input, Output, State
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from datetime import datetime

from data_generator import generate_orders, get_funnel_data, get_hospital_heatmap_data, calculate_sla_compliance, get_grid_heatmap_data, export_dashboard_pdf

app = dash.Dash(__name__)
server = app.server

df_all, hospitals_df = generate_orders()

cities = ["全部城市"] + sorted(df_all["city"].unique().tolist())
date_min = df_all["publish_date"].min()
date_max = df_all["publish_date"].max()

app.layout = html.Div([
    html.Div([
        html.Div([
            html.H1("陪诊员订单撮合平台 - 运营看板", 
                    style={"color": "#2c3e50", "margin": "0", "fontSize": "24px", "fontWeight": "bold"}),
            html.P("实时监控「需求发布→陪诊员接单→服务完成」全链路转化", 
                   style={"color": "#7f8c8d", "margin": "5px 0 0 0", "fontSize": "14px"}),
        ], style={"flex": "1"}),
        html.Div([
            html.Div([
                html.Span("📊 数据更新时间: ", style={"fontSize": "12px", "color": "#7f8c8d"}),
                html.Span(datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 
                          style={"fontSize": "12px", "color": "#34495e", "fontWeight": "bold"}),
            ], style={"background": "#ecf0f1", "padding": "8px 16px", "borderRadius": "20px"})
        ], style={"display": "flex", "alignItems": "center"})
    ], style={"display": "flex", "justifyContent": "space-between", "alignItems": "center", 
              "padding": "20px 30px", "background": "white", "borderBottom": "3px solid #3498db",
              "boxShadow": "0 2px 10px rgba(0,0,0,0.1)"}),

    html.Div([
        html.Div([
            html.Label("📅 日期范围", style={"fontWeight": "bold", "color": "#2c3e50", "marginBottom": "8px", "display": "block"}),
            dcc.DatePickerRange(
                id="date-range",
                min_date_allowed=date_min,
                max_date_allowed=date_max,
                start_date=date_min,
                end_date=date_max,
                display_format="YYYY-MM-DD",
                style={"width": "100%"}
            )
        ], style={"flex": "1", "marginRight": "20px"}),
        
        html.Div([
            html.Label("🏙️ 城市筛选", style={"fontWeight": "bold", "color": "#2c3e50", "marginBottom": "8px", "display": "block"}),
            dcc.Dropdown(
                id="city-filter",
                options=[{"label": c, "value": c} for c in cities],
                value="全部城市",
                clearable=False,
                style={"width": "100%"}
            )
        ], style={"width": "200px"}),
        
        html.Div([
            html.Button("🔄 刷新数据", id="refresh-btn", n_clicks=0,
                        style={"background": "#3498db", "color": "white", "border": "none", 
                               "padding": "10px 20px", "borderRadius": "8px", "cursor": "pointer",
                               "fontWeight": "bold", "marginTop": "25px", "marginRight": "10px"}),
            html.Button("📄 导出 PDF", id="export-pdf-btn", n_clicks=0,
                        style={"background": "#27ae60", "color": "white", "border": "none", 
                               "padding": "10px 20px", "borderRadius": "8px", "cursor": "pointer",
                               "fontWeight": "bold", "marginTop": "25px"})
        ], style={"display": "flex", "alignItems": "flex-end"})
    ], style={"display": "flex", "alignItems": "flex-start", "padding": "20px 30px", "background": "#f8f9fa"}),

    html.Div([
        html.Div([
            html.Div([
                html.Div([
                    html.P("📝 需求发布", style={"fontSize": "14px", "color": "#7f8c8d", "margin": "0"}),
                    html.H3(id="kpi-published", style={"fontSize": "28px", "color": "#2c3e50", "margin": "5px 0", "fontWeight": "bold"}),
                    html.P(id="kpi-published-yoy", style={"fontSize": "12px", "color": "#27ae60", "margin": "0"})
                ], style={"flex": "1", "padding": "15px 20px", "borderLeft": "4px solid #3498db"}),
                
                html.Div([
                    html.P("✅ 陪诊员接单", style={"fontSize": "14px", "color": "#7f8c8d", "margin": "0"}),
                    html.H3(id="kpi-accepted", style={"fontSize": "28px", "color": "#f39c12", "margin": "5px 0", "fontWeight": "bold"}),
                    html.P(id="kpi-accept-rate", style={"fontSize": "12px", "color": "#f39c12", "margin": "0"})
                ], style={"flex": "1", "padding": "15px 20px", "borderLeft": "4px solid #f39c12"}),
                
                html.Div([
                    html.P("🎉 服务完成", style={"fontSize": "14px", "color": "#7f8c8d", "margin": "0"}),
                    html.H3(id="kpi-completed", style={"fontSize": "28px", "color": "#27ae60", "margin": "5px 0", "fontWeight": "bold"}),
                    html.P(id="kpi-complete-rate", style={"fontSize": "12px", "color": "#27ae60", "margin": "0"})
                ], style={"flex": "1", "padding": "15px 20px", "borderLeft": "4px solid #27ae60"}),
                
                html.Div([
                    html.P("💰 总交易额", style={"fontSize": "14px", "color": "#7f8c8d", "margin": "0"}),
                    html.H3(id="kpi-revenue", style={"fontSize": "28px", "color": "#9b59b6", "margin": "5px 0", "fontWeight": "bold"}),
                    html.P(id="kpi-avg-price", style={"fontSize": "12px", "color": "#9b59b6", "margin": "0"})
                ], style={"flex": "1", "padding": "15px 20px", "borderLeft": "4px solid #9b59b6"})
            ], style={"display": "flex", "background": "white", "borderRadius": "12px", "boxShadow": "0 2px 8px rgba(0,0,0,0.08)",
                      "overflow": "hidden"})
        ], style={"gridColumn": "1 / -1"})
    ], style={"padding": "0 30px"}),

    html.Div([
        html.Div([
            html.Div([
                html.H3("📊 转化漏斗分析", 
                        style={"margin": "0 0 15px 0", "fontSize": "18px", "color": "#2c3e50", "fontWeight": "bold"}),
                dcc.Graph(id="funnel-chart", config={"displayModeBar": False})
            ], style={"background": "white", "padding": "20px", "borderRadius": "12px", "boxShadow": "0 2px 8px rgba(0,0,0,0.08)",
                      "height": "100%"})
        ], style={"gridColumn": "1 / 2"}),
        
        html.Div([
            html.Div([
                html.Div([
                    html.H3("🗺️ 医院周边订单热力分布", 
                            style={"margin": "0", "fontSize": "18px", "color": "#2c3e50", "fontWeight": "bold"}),
                    html.Button("← 返回全局视图", id="back-to-global-btn", n_clicks=0,
                                style={"display": "none", "background": "#95a5a6", "color": "white", 
                                       "border": "none", "padding": "6px 14px", "borderRadius": "6px", 
                                       "cursor": "pointer", "fontSize": "13px", "fontWeight": "bold"}),
                ], style={"display": "flex", "justifyContent": "space-between", "alignItems": "center", "marginBottom": "15px"}),
                dcc.Store(id="drill-down-hospital-id", data=None),
                dcc.Graph(id="heatmap-chart", config={"displayModeBar": False})
            ], style={"background": "white", "padding": "20px", "borderRadius": "12px", "boxShadow": "0 2px 8px rgba(0,0,0,0.08)",
                      "height": "100%"})
        ], style={"gridColumn": "2 / 3"})
    ], style={"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "20px", "padding": "20px 30px"}),

    html.Div([
        html.Div([
            html.Div([
                html.H3("⏱️ SLA 响应达标率趋势", 
                        style={"margin": "0 0 15px 0", "fontSize": "18px", "color": "#2c3e50", "fontWeight": "bold"}),
                dcc.Graph(id="sla-chart", config={"displayModeBar": False})
            ], style={"background": "white", "padding": "20px", "borderRadius": "12px", "boxShadow": "0 2px 8px rgba(0,0,0,0.08)",
                      "height": "100%"})
        ], style={"gridColumn": "1 / -1"})
    ], style={"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "20px", "padding": "0 30px 20px 30px"}),

    html.Div([
        html.Div([
            html.Div([
                html.H3("📈 各阶段转化明细", 
                        style={"margin": "0 0 15px 0", "fontSize": "18px", "color": "#2c3e50", "fontWeight": "bold"}),
                html.Div(id="funnel-detail", 
                         style={"display": "grid", "gridTemplateColumns": "repeat(3, 1fr)", "gap": "15px"})
            ], style={"background": "white", "padding": "20px", "borderRadius": "12px", "boxShadow": "0 2px 8px rgba(0,0,0,0.08)"})
        ], style={"gridColumn": "1 / -1"})
    ], style={"padding": "0 30px 30px 30px"}),

    dcc.Download(id="download-pdf"),
], style={"background": "#f0f2f5", "minHeight": "100vh", "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"})


def filter_data(start_date, end_date, city, df_source=None):
    df = (df_source if df_source is not None else df_all).copy()
    
    if isinstance(start_date, str):
        start_date = pd.to_datetime(start_date)
    if isinstance(end_date, str):
        end_date = pd.to_datetime(end_date)
    
    end_date_inclusive = end_date + pd.Timedelta(days=1)
    
    df = df[(df["publish_date"] >= start_date) & (df["publish_date"] < end_date_inclusive)]
    
    if city != "全部城市":
        df = df[df["city"] == city]
    
    return df


@app.callback(
    [Output("kpi-published", "children"),
     Output("kpi-published-yoy", "children"),
     Output("kpi-accepted", "children"),
     Output("kpi-accept-rate", "children"),
     Output("kpi-completed", "children"),
     Output("kpi-complete-rate", "children"),
     Output("kpi-revenue", "children"),
     Output("kpi-avg-price", "children"),
     Output("funnel-chart", "figure"),
     Output("heatmap-chart", "figure"),
     Output("sla-chart", "figure"),
     Output("funnel-detail", "children"),
     Output("drill-down-hospital-id", "data"),
     Output("back-to-global-btn", "style")],
    [Input("date-range", "start_date"),
     Input("date-range", "end_date"),
     Input("city-filter", "value"),
     Input("refresh-btn", "n_clicks"),
     Input("heatmap-chart", "clickData"),
     Input("back-to-global-btn", "n_clicks")],
    [State("drill-down-hospital-id", "data")],
    prevent_initial_call=False
)
def update_dashboard(start_date, end_date, city, n_clicks, clickData, back_clicks, drill_down_hospital_id):
    ctx = dash.callback_context
    triggered = ctx.triggered[0]["prop_id"] if ctx.triggered else ""
    
    new_drill_down_id = drill_down_hospital_id
    
    if triggered == "back-to-global-btn.n_clicks":
        new_drill_down_id = None
    elif triggered == "heatmap-chart.clickData" and clickData and "points" in clickData and len(clickData["points"]) > 0:
        point = clickData["points"][0]
        if "customdata" in point and point["customdata"]:
            new_drill_down_id = point["customdata"][0]
    
    back_btn_style = {"display": "block", "background": "#95a5a6", "color": "white", 
                      "border": "none", "padding": "6px 14px", "borderRadius": "6px", 
                      "cursor": "pointer", "fontSize": "13px", "fontWeight": "bold"} if new_drill_down_id else {"display": "none"}
    
    df = filter_data(start_date, end_date, city)
    
    total_published = len(df)
    total_accepted = df["accepted"].sum()
    total_completed = df["completed"].sum()
    total_revenue = df[df["completed"] == 1]["price"].sum()
    
    accept_rate = (total_accepted / total_published * 100) if total_published > 0 else 0
    complete_rate = (total_completed / total_accepted * 100) if total_accepted > 0 else 0
    avg_price = (total_revenue / total_completed) if total_completed > 0 else 0
    
    funnel_df = get_funnel_data(df)
    
    fig_funnel = go.Figure(go.Funnel(
        y=funnel_df["stage"],
        x=funnel_df["count"],
        textinfo="value+percent initial+percent previous",
        textfont={"size": 14, "color": "white"},
        marker={"color": ["#3498db", "#f39c12", "#27ae60"]},
        opacity=0.85,
        connector={"line": {"color": "#bdc3c7", "width": 3}}
    ))
    
    fig_funnel.update_layout(
        title={"text": f"<b>{city if city != '全部城市' else '全国'}</b> 订单转化漏斗", 
               "x": 0.5, "xanchor": "center", "font": {"size": 16}},
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        margin={"l": 10, "r": 10, "t": 60, "b": 10},
        height=400
    )
    
    heatmap_df = get_hospital_heatmap_data(df, hospitals_df)
    
    has_city_column = "city" in heatmap_df.columns if len(heatmap_df) > 0 else False
    
    if new_drill_down_id and len(heatmap_df) > 0:
        hospital_info = heatmap_df[heatmap_df["hospital_id"] == new_drill_down_id]
        if len(hospital_info) > 0:
            hospital_lat = hospital_info["lat"].values[0]
            hospital_lon = hospital_info["lon"].values[0]
            hospital_name = hospital_info["hospital_name"].values[0]
            
            grid_df = get_grid_heatmap_data(df, hospital_lat, hospital_lon, grid_size_meters=500)
            
            if len(grid_df) > 0 and grid_df["order_count"].sum() > 0:
                fig_heatmap = go.Figure(go.Densitymapbox(
                    lat=grid_df["grid_lat"],
                    lon=grid_df["grid_lon"],
                    z=grid_df["order_count"],
                    radius=25,
                    colorscale="Reds",
                    showscale=True,
                    colorbar={"title": "订单量"},
                    hovertemplate="纬度: %{lat:.4f}<br>经度: %{lon:.4f}<br>订单数: %{z}<extra></extra>"
                ))
                
                fig_heatmap.add_trace(go.Scattermapbox(
                    lat=[hospital_lat],
                    lon=[hospital_lon],
                    mode="markers",
                    marker={"size": 15, "color": "#3498db", "symbol": "hospital"},
                    hovertemplate=f"<b>{hospital_name}</b><br><extra></extra>",
                    showlegend=False
                ))
                
                fig_heatmap.update_layout(
                    mapbox={
                        "style": "carto-positron",
                        "zoom": 13,
                        "center": {"lat": hospital_lat, "lon": hospital_lon}
                    }
                )
            else:
                fig_heatmap = go.Figure()
                fig_heatmap.update_layout(
                    mapbox={"style": "carto-positron", "zoom": 13, "center": {"lat": hospital_lat, "lon": hospital_lon}},
                    annotations=[{"text": f"{hospital_name} 周边暂无订单数据", "showarrow": False, "font": {"size": 16, "color": "gray"}}]
                )
            
            fig_heatmap.update_layout(
                title={"text": f"<b>{hospital_name} 周边 500m 网格订单热力</b>", "x": 0.5, "xanchor": "center", "font": {"size": 16}},
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
                margin={"l": 10, "r": 10, "t": 60, "b": 10},
                height=400
            )
        else:
            new_drill_down_id = None
            back_btn_style = {"display": "none"}
    
    if not new_drill_down_id:
        if len(heatmap_df) > 0 and has_city_column:
            max_orders = heatmap_df["total_orders"].max()
            heatmap_df["size"] = heatmap_df["total_orders"].apply(
                lambda x: max(15, int(x / max_orders * 60))
            )
            heatmap_df["hover_text"] = heatmap_df.apply(
                lambda row: f"<b>{row['hospital_name']}</b><br>"
                           f"城市: {row['city']}<br>"
                           f"总订单数: {row['total_orders']}<br>"
                           f"接单率: {row['accept_rate']}%<br>"
                           f"完成率: {row['complete_rate']}%<br>"
                           f"平均客单价: ¥{row['avg_price']:.0f}",
                axis=1
            )
            
            fig_heatmap = px.scatter_mapbox(
                heatmap_df,
                lat="lat",
                lon="lon",
                size="size",
                color="total_orders",
                hover_name="hospital_name",
                hover_data={"hover_text": True, "size": False, "lat": False, "lon": False, "hospital_id": True},
                custom_data=["hospital_id"],
                color_continuous_scale="Reds",
                zoom=4,
                center={"lat": 32.5, "lon": 115.5} if city == "全部城市" else None,
                mapbox_style="carto-positron",
                title="医院周边订单密度"
            )
            
            fig_heatmap.update_traces(
                text=heatmap_df["hover_text"],
                hovertemplate="%{text}<extra></extra>"
            )
            
            if city != "全部城市":
                city_data = heatmap_df[heatmap_df["city"] == city]
                if len(city_data) > 0:
                    fig_heatmap.update_layout(
                        mapbox={"zoom": 10, "center": {"lat": city_data["lat"].mean(), "lon": city_data["lon"].mean()}}
                    )
        else:
            fig_heatmap = go.Figure()
            fig_heatmap.update_layout(
                title="暂无数据",
                mapbox={"style": "carto-positron", "zoom": 4, "center": {"lat": 32.5, "lon": 115.5}},
                annotations=[{"text": "当前筛选条件下无订单数据", "showarrow": False, "font": {"size": 16, "color": "gray"}}]
            )
        
        fig_heatmap.update_layout(
            title={"text": "<b>医院周边订单热力分布</b>", "x": 0.5, "xanchor": "center", "font": {"size": 16}},
            coloraxis_colorbar={"title": "订单量"},
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            margin={"l": 10, "r": 10, "t": 60, "b": 10},
            height=400
        )
    
    sla_df = calculate_sla_compliance(df)
    
    if len(sla_df) > 0:
        fig_sla = go.Figure()
        
        fig_sla.add_trace(go.Scatter(
            x=sla_df["date"],
            y=sla_df["sla_rate"],
            mode="lines+markers",
            name="SLA达标率",
            line={"color": "#3498db", "width": 3},
            marker={"size": 8, "color": "#3498db"},
            hovertemplate="日期: %{x}<br>达标率: %{y}%<extra></extra>"
        ))
        
        fig_sla.add_trace(go.Scatter(
            x=sla_df["date"],
            y=[95] * len(sla_df),
            mode="lines",
            name="15分钟响应达标线",
            line={"color": "#e74c3c", "width": 2, "dash": "dash"},
            hovertemplate="15分钟响应达标线: 95%<extra></extra>"
        ))
    else:
        fig_sla = go.Figure()
        fig_sla.update_layout(
            annotations=[{"text": "当前筛选条件下无SLA数据", "showarrow": False, "font": {"size": 16, "color": "gray"}}]
        )
    
    fig_sla.update_layout(
        title={"text": f"<b>{city if city != '全部城市' else '全国'}</b> SLA 响应达标率趋势", 
               "x": 0.5, "xanchor": "center", "font": {"size": 16}},
        yaxis={"title": "达标率 (%)", "range": [0, 100], "tickformat": ".0f"},
        xaxis={"title": "日期"},
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        margin={"l": 10, "r": 10, "t": 60, "b": 10},
        height=400,
        legend={"orientation": "h", "y": -0.2, "x": 0.5, "xanchor": "center"},
        hovermode="x unified"
    )
    
    detail_cards = []
    
    stages = [
        {"title": "需求发布", "count": total_published, "icon": "📝", "color": "#3498db",
         "metric": f"{total_published:,}", "subtitle": "总需求数"},
        {"title": "陪诊员接单", "count": total_accepted, "icon": "✅", "color": "#f39c12",
         "metric": f"{accept_rate:.1f}%", "subtitle": f"接单率 ({total_accepted:,}/{total_published:,})"},
        {"title": "服务完成", "count": total_completed, "icon": "🎉", "color": "#27ae60",
         "metric": f"{complete_rate:.1f}%", "subtitle": f"完成率 ({total_completed:,}/{total_accepted:,})"}
    ]
    
    for i, stage in enumerate(stages):
        prev_count = stages[i-1]["count"] if i > 0 else stage["count"]
        conv_rate = (stage["count"] / prev_count * 100) if prev_count > 0 else 0
        
        card = html.Div([
            html.Div([
                html.Span(stage["icon"], style={"fontSize": "24px"}),
                html.H4(stage["title"], style={"margin": "5px 0", "color": stage["color"], "fontSize": "16px"}),
                html.H2(stage["metric"], style={"margin": "0", "color": "#2c3e50", "fontSize": "32px", "fontWeight": "bold"}),
                html.P(stage["subtitle"], style={"margin": "5px 0", "color": "#7f8c8d", "fontSize": "13px"}),
                html.Div([
                    html.Div(style={"width": f"{conv_rate}%", "height": "8px", 
                                   "background": stage["color"], "borderRadius": "4px",
                                   "transition": "width 0.5s ease"}),
                ], style={"width": "100%", "height": "8px", "background": "#ecf0f1", "borderRadius": "4px", "marginTop": "10px"}),
                html.P(f"阶段转化率: {conv_rate:.1f}%", 
                       style={"margin": "8px 0 0 0", "color": stage["color"], "fontSize": "12px", "fontWeight": "bold"})
            ], style={"padding": "20px", "background": f"{stage['color']}08", 
                     "borderRadius": "12px", "border": f"2px solid {stage['color']}20",
                     "textAlign": "center"})
        ])
        detail_cards.append(card)
    
    return (
        f"{total_published:,}",
        f"总需求发布数",
        f"{total_accepted:,}",
        f"接单率: {accept_rate:.1f}%",
        f"{total_completed:,}",
        f"完成率: {complete_rate:.1f}%",
        f"¥{total_revenue:,.0f}",
        f"平均客单价: ¥{avg_price:.0f}",
        fig_funnel,
        fig_heatmap,
        fig_sla,
        detail_cards,
        new_drill_down_id,
        back_btn_style
    )


def generate_dashboard_data(start_date, end_date, city):
    df = filter_data(start_date, end_date, city)
    
    total_published = len(df)
    total_accepted = df["accepted"].sum()
    total_completed = df["completed"].sum()
    total_revenue = df[df["completed"] == 1]["price"].sum()
    
    accept_rate = (total_accepted / total_published * 100) if total_published > 0 else 0
    complete_rate = (total_completed / total_accepted * 100) if total_accepted > 0 else 0
    avg_price = (total_revenue / total_completed) if total_completed > 0 else 0
    
    kpi_data = {
        "total_published": total_published,
        "total_accepted": total_accepted,
        "total_completed": total_completed,
        "total_revenue": total_revenue,
        "accept_rate": accept_rate,
        "complete_rate": complete_rate,
        "avg_price": avg_price
    }
    
    funnel_df = get_funnel_data(df)
    
    fig_funnel = go.Figure(go.Funnel(
        y=funnel_df["stage"],
        x=funnel_df["count"],
        textinfo="value+percent initial+percent previous",
        textfont={"size": 14, "color": "white"},
        marker={"color": ["#3498db", "#f39c12", "#27ae60"]},
        opacity=0.85,
        connector={"line": {"color": "#bdc3c7", "width": 3}}
    ))
    
    fig_funnel.update_layout(
        title={"text": f"<b>{city if city != '全部城市' else '全国'}</b> 订单转化漏斗", 
               "x": 0.5, "xanchor": "center", "font": {"size": 16}},
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        margin={"l": 10, "r": 10, "t": 60, "b": 10},
        height=400
    )
    
    heatmap_df = get_hospital_heatmap_data(df, hospitals_df)
    
    has_city_column = "city" in heatmap_df.columns if len(heatmap_df) > 0 else False
    
    if len(heatmap_df) > 0 and has_city_column:
        max_orders = heatmap_df["total_orders"].max()
        heatmap_df["size"] = heatmap_df["total_orders"].apply(
            lambda x: max(15, int(x / max_orders * 60))
        )
        heatmap_df["hover_text"] = heatmap_df.apply(
            lambda row: f"<b>{row['hospital_name']}</b><br>"
                       f"城市: {row['city']}<br>"
                       f"总订单数: {row['total_orders']}<br>"
                       f"接单率: {row['accept_rate']}%<br>"
                       f"完成率: {row['complete_rate']}%<br>"
                       f"平均客单价: ¥{row['avg_price']:.0f}",
            axis=1
        )
        
        fig_heatmap = px.scatter_mapbox(
            heatmap_df,
            lat="lat",
            lon="lon",
            size="size",
            color="total_orders",
            hover_name="hospital_name",
            hover_data={"hover_text": True, "size": False, "lat": False, "lon": False},
            color_continuous_scale="Reds",
            zoom=4,
            center={"lat": 32.5, "lon": 115.5} if city == "全部城市" else None,
            mapbox_style="carto-positron",
            title="医院周边订单密度"
        )
        
        fig_heatmap.update_traces(
            text=heatmap_df["hover_text"],
            hovertemplate="%{text}<extra></extra>"
        )
        
        if city != "全部城市":
            city_data = heatmap_df[heatmap_df["city"] == city]
            if len(city_data) > 0:
                fig_heatmap.update_layout(
                    mapbox={"zoom": 10, "center": {"lat": city_data["lat"].mean(), "lon": city_data["lon"].mean()}}
                )
    else:
        fig_heatmap = go.Figure()
        fig_heatmap.update_layout(
            title="暂无数据",
            mapbox={"style": "carto-positron", "zoom": 4, "center": {"lat": 32.5, "lon": 115.5}},
            annotations=[{"text": "当前筛选条件下无订单数据", "showarrow": False, "font": {"size": 16, "color": "gray"}}]
        )
    
    fig_heatmap.update_layout(
        title={"text": "<b>医院周边订单热力分布</b>", "x": 0.5, "xanchor": "center", "font": {"size": 16}},
        coloraxis_colorbar={"title": "订单量"},
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        margin={"l": 10, "r": 10, "t": 60, "b": 10},
        height=400
    )
    
    sla_df = calculate_sla_compliance(df)
    
    if len(sla_df) > 0:
        fig_sla = go.Figure()
        
        fig_sla.add_trace(go.Scatter(
            x=sla_df["date"],
            y=sla_df["sla_rate"],
            mode="lines+markers",
            name="SLA达标率",
            line={"color": "#3498db", "width": 3},
            marker={"size": 8, "color": "#3498db"},
            hovertemplate="日期: %{x}<br>达标率: %{y}%<extra></extra>"
        ))
        
        fig_sla.add_trace(go.Scatter(
            x=sla_df["date"],
            y=[95] * len(sla_df),
            mode="lines",
            name="15分钟响应达标线",
            line={"color": "#e74c3c", "width": 2, "dash": "dash"},
            hovertemplate="15分钟响应达标线: 95%<extra></extra>"
        ))
    else:
        fig_sla = go.Figure()
        fig_sla.update_layout(
            annotations=[{"text": "当前筛选条件下无SLA数据", "showarrow": False, "font": {"size": 16, "color": "gray"}}]
        )
    
    fig_sla.update_layout(
        title={"text": f"<b>{city if city != '全部城市' else '全国'}</b> SLA 响应达标率趋势", 
               "x": 0.5, "xanchor": "center", "font": {"size": 16}},
        yaxis={"title": "达标率 (%)", "range": [0, 100], "tickformat": ".0f"},
        xaxis={"title": "日期"},
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        margin={"l": 10, "r": 10, "t": 60, "b": 10},
        height=400,
        legend={"orientation": "h", "y": -0.2, "x": 0.5, "xanchor": "center"},
        hovermode="x unified"
    )
    
    return fig_funnel, fig_heatmap, fig_sla, kpi_data


@app.callback(
    Output("download-pdf", "data"),
    Input("export-pdf-btn", "n_clicks"),
    State("date-range", "start_date"),
    State("date-range", "end_date"),
    State("city-filter", "value"),
    prevent_initial_call=True
)
def export_pdf(n_clicks, start_date, end_date, city):
    if n_clicks is None or n_clicks == 0:
        return None
    
    fig_funnel, fig_heatmap, fig_sla, kpi_data = generate_dashboard_data(start_date, end_date, city)
    
    filename = f"dashboard_{pd.to_datetime(start_date).strftime('%Y%m%d')}_{pd.to_datetime(end_date).strftime('%Y%m%d')}_{city}.pdf"
    
    pdf_bytes = export_dashboard_pdf(fig_funnel, fig_heatmap, fig_sla, kpi_data, filename)
    
    return dcc.send_bytes(pdf_bytes, filename)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8050)
