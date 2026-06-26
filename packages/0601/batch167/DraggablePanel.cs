using System;
using System.Collections;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

[RequireComponent(typeof(RectTransform))]
public class DraggablePanel : MonoBehaviour,
    IPointerDownHandler,
    IBeginDragHandler, IDragHandler, IEndDragHandler
{
    public RectTransform header;
    public RectTransform resizeHandle;
    public Button closeButton;
    public Button maximizeButton;
    public Button minimizeButton;
    public RectTransform content;

    public Vector2 minSize = new Vector2(200f, 150f);
    public float headerHeight = 36f;
    public float animationDuration = 0.2f;

    private RectTransform panelRect;
    private Canvas canvas;
    private RectTransform canvasRect;

    private enum WindowState { Normal, Maximized, Minimized }
    private WindowState windowState = WindowState.Normal;

    private Vector2 savedPosition;
    private Vector2 savedSize;

    private Coroutine animCoroutine;

    private enum DragMode { None, Move, Resize }
    private DragMode dragMode = DragMode.None;

    private Vector2 dragStartPointerPos;
    private Vector2 dragStartAnchoredPos;
    private Vector2 resizeStartSize;

    private void Awake()
    {
        panelRect = GetComponent<RectTransform>();
        canvas = GetComponentInParent<Canvas>();
        if (canvas != null)
            canvasRect = canvas.GetComponent<RectTransform>();
        if (closeButton != null)
            closeButton.onClick.AddListener(ClosePanel);
        if (maximizeButton != null)
            maximizeButton.onClick.AddListener(ToggleMaximize);
        if (minimizeButton != null)
            minimizeButton.onClick.AddListener(ToggleMinimize);
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        if (animCoroutine != null) return;
        SetAsTopSibling();
    }

    public void OnBeginDrag(PointerEventData eventData)
    {
        if (animCoroutine != null) return;

        if (windowState != WindowState.Normal)
        {
            if (windowState == WindowState.Maximized)
                RestoreFromMaximized(eventData);
            else if (windowState == WindowState.Minimized)
                RestoreFromMinimized();

            dragMode = DragMode.None;
            return;
        }

        if (IsPointerOverRect(eventData, resizeHandle))
        {
            dragMode = DragMode.Resize;
            resizeStartSize = panelRect.rect.size;
            dragStartAnchoredPos = panelRect.anchoredPosition;
            dragStartPointerPos = eventData.position;
        }
        else if (IsPointerOverRect(eventData, header))
        {
            dragMode = DragMode.Move;
            dragStartAnchoredPos = panelRect.anchoredPosition;
            dragStartPointerPos = eventData.position;
        }
        else
        {
            dragMode = DragMode.None;
        }
    }

    public void OnDrag(PointerEventData eventData)
    {
        if (dragMode == DragMode.None) return;
        if (animCoroutine != null) return;

        if (dragMode == DragMode.Move)
        {
            Camera cam = canvas.renderMode == RenderMode.ScreenSpaceOverlay
                ? null
                : eventData.pressEventCamera;

            Vector2 currentLocal;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                canvasRect, eventData.position, cam, out currentLocal);

            Vector2 startLocal;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                canvasRect, dragStartPointerPos, cam, out startLocal);

            Vector2 delta = currentLocal - startLocal;
            Vector2 newPos = dragStartAnchoredPos + delta;
            panelRect.anchoredPosition = ClampPositionToCanvas(newPos);
        }
        else if (dragMode == DragMode.Resize)
        {
            Vector2 pointerDelta = eventData.position - dragStartPointerPos;
            pointerDelta /= canvas.scaleFactor;

            float newWidth = Mathf.Max(minSize.x, resizeStartSize.x + pointerDelta.x);
            float newHeight = Mathf.Max(minSize.y, resizeStartSize.y - pointerDelta.y);

            float dw = newWidth - resizeStartSize.x;
            float dh = newHeight - resizeStartSize.y;

            Vector2 pivot = panelRect.pivot;
            Vector2 newPos = new Vector2(
                dragStartAnchoredPos.x + pivot.x * dw,
                dragStartAnchoredPos.y - (1f - pivot.y) * dh
            );

            panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, newWidth);
            panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, newHeight);
            panelRect.anchoredPosition = ClampPositionToCanvas(newPos);

            if (content != null)
                LayoutRebuilder.ForceRebuildLayoutImmediate(content);
        }
    }

    public void OnEndDrag(PointerEventData eventData)
    {
        dragMode = DragMode.None;
    }

    private bool IsPointerOverRect(PointerEventData eventData, RectTransform rect)
    {
        if (rect == null) return false;
        return RectTransformUtility.RectangleContainsScreenPoint(
            rect, eventData.position, eventData.pressEventCamera);
    }

    private Vector2 ClampPositionToCanvas(Vector2 position)
    {
        return ClampPosition(position, panelRect.rect.size, panelRect.pivot, canvasRect.rect.width, canvasRect.rect.height);
    }

    internal static Vector2 ClampPosition(Vector2 position, Vector2 panelSize, Vector2 pivot, float canvasWidth, float canvasHeight)
    {
        float halfWidth = panelSize.x * 0.5f;
        float halfHeight = panelSize.y * 0.5f;

        float canvasHalfWidth = canvasWidth * 0.5f;
        float canvasHalfHeight = canvasHeight * 0.5f;

        float pivotOffsetX = pivot.x * panelSize.x - halfWidth;
        float pivotOffsetY = pivot.y * panelSize.y - halfHeight;

        float minX = -canvasHalfWidth + halfWidth + pivotOffsetX;
        float maxX = canvasHalfWidth - halfWidth + pivotOffsetX;
        float minY = -canvasHalfHeight + halfHeight + pivotOffsetY;
        float maxY = canvasHalfHeight - halfHeight + pivotOffsetY;

        return new Vector2(
            Mathf.Clamp(position.x, minX, maxX),
            Mathf.Clamp(position.y, minY, maxY)
        );
    }

    private void SetAsTopSibling()
    {
        panelRect.SetAsLastSibling();
    }

    public void ClosePanel()
    {
        gameObject.SetActive(false);
    }

    public void OpenPanel()
    {
        gameObject.SetActive(true);
        SetAsTopSibling();
    }

    public void ToggleMaximize()
    {
        if (animCoroutine != null) return;

        if (windowState == WindowState.Maximized)
            AnimateToState(WindowState.Normal);
        else
            AnimateToState(WindowState.Maximized);
    }

    public void ToggleMinimize()
    {
        if (animCoroutine != null) return;

        if (windowState == WindowState.Minimized)
            AnimateToState(WindowState.Normal);
        else
            AnimateToState(WindowState.Minimized);
    }

    private void AnimateToState(WindowState targetState)
    {
        if (windowState == WindowState.Normal)
        {
            savedPosition = panelRect.anchoredPosition;
            savedSize = panelRect.rect.size;
        }

        Vector2 targetPos;
        Vector2 targetSize;

        switch (targetState)
        {
            case WindowState.Maximized:
                targetSize = canvasRect.rect.size;
                targetPos = Vector2.zero;
                break;

            case WindowState.Minimized:
                targetSize = new Vector2(savedSize.x, headerHeight);
                float offsetY = (savedSize.y * 0.5f - headerHeight * 0.5f) * (1f - panelRect.pivot.y)
                              - (savedSize.y * 0.5f - headerHeight * 0.5f) * panelRect.pivot.y;
                targetPos = new Vector2(savedPosition.x, savedPosition.y + offsetY);
                break;

            default:
                targetSize = savedSize;
                targetPos = savedPosition;
                break;
        }

        Vector2 startPos = panelRect.anchoredPosition;
        Vector2 startSize = panelRect.rect.size;

        if (animCoroutine != null)
            StopCoroutine(animCoroutine);

        animCoroutine = StartCoroutine(AnimatePanel(startPos, startSize, targetPos, targetSize, targetState));
    }

    private IEnumerator AnimatePanel(
        Vector2 startPos, Vector2 startSize,
        Vector2 targetPos, Vector2 targetSize,
        WindowState targetState)
    {
        float elapsed = 0f;

        while (elapsed < animationDuration)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = Mathf.Clamp01(elapsed / animationDuration);
            float eased = EaseOutCubic(t);

            Vector2 currentSize = Vector2.LerpUnclamped(startSize, targetSize, eased);
            Vector2 currentPos = Vector2.LerpUnclamped(startPos, targetPos, eased);

            panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, currentSize.x);
            panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, currentSize.y);
            panelRect.anchoredPosition = currentPos;

            UpdateContentVisibility(currentSize.y, targetState);
            if (content != null)
                LayoutRebuilder.ForceRebuildLayoutImmediate(content);

            yield return null;
        }

        panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, targetSize.x);
        panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, targetSize.y);
        panelRect.anchoredPosition = targetPos;

        windowState = targetState;
        UpdateContentVisibility(targetSize.y, targetState);
        if (content != null)
            LayoutRebuilder.ForceRebuildLayoutImmediate(content);

        animCoroutine = null;
    }

    private void RestoreFromMaximized(PointerEventData eventData)
    {
        Camera cam = canvas.renderMode == RenderMode.ScreenSpaceOverlay
            ? null
            : eventData.pressEventCamera;

        Vector2 pointerLocal;
        RectTransformUtility.ScreenPointToLocalPointInRectangle(
            canvasRect, eventData.position, cam, out pointerLocal);

        float pointerRatioX = 0.5f;
        if (savedSize.x > 0f)
            pointerRatioX = Mathf.Clamp01((pointerLocal.x - (savedPosition.x - savedSize.x * 0.5f)) / savedSize.x);

        windowState = WindowState.Normal;

        panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, savedSize.x);
        panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, savedSize.y);

        float newX = pointerLocal.x - pointerRatioX * savedSize.x;
        panelRect.anchoredPosition = ClampPositionToCanvas(new Vector2(newX, savedPosition.y));

        UpdateContentVisibility(savedSize.y, WindowState.Normal);
        if (content != null)
            LayoutRebuilder.ForceRebuildLayoutImmediate(content);
    }

    private void RestoreFromMinimized()
    {
        windowState = WindowState.Normal;

        panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Horizontal, savedSize.x);
        panelRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, savedSize.y);
        panelRect.anchoredPosition = ClampPositionToCanvas(savedPosition);

        UpdateContentVisibility(savedSize.y, WindowState.Normal);
        if (content != null)
            LayoutRebuilder.ForceRebuildLayoutImmediate(content);
    }

    private void UpdateContentVisibility(float currentHeight, WindowState targetState)
    {
        if (content == null) return;

        float ratio = 1f;
        if (targetState == WindowState.Minimized)
            ratio = Mathf.Clamp01((currentHeight - headerHeight) / Mathf.Max(1f, savedSize.y - headerHeight));
        else if (windowState == WindowState.Minimized)
            ratio = Mathf.Clamp01((currentHeight - headerHeight) / Mathf.Max(1f, savedSize.y - headerHeight));

        bool show = ratio > 0.01f;
        content.gameObject.SetActive(show);
        if (show)
        {
            CanvasGroup cg = content.GetComponent<CanvasGroup>();
            if (cg != null)
                cg.alpha = ratio;
        }
    }

    private static float EaseOutCubic(float t)
    {
        return 1f - Mathf.Pow(1f - t, 3f);
    }
}
