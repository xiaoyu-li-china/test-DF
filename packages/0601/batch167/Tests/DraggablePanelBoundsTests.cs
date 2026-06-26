using NUnit.Framework;
using UnityEngine;

public class DraggablePanelBoundsTests
{
    private const float CanvasWidth = 1920f;
    private const float CanvasHeight = 1080f;
    private const float PanelWidth = 400f;
    private const float PanelHeight = 300f;
    private readonly Vector2 DefaultPivot = new Vector2(0.5f, 0.5f);

    [Test]
    public void ClampPosition_DragPastLeftEdge_PositionXNotLessThanMinX()
    {
        Vector2 result = DraggablePanel.ClampPosition(
            new Vector2(-5000f, 0f),
            new Vector2(PanelWidth, PanelHeight),
            DefaultPivot,
            CanvasWidth, CanvasHeight
        );

        float panelLeftEdge = result.x - PanelWidth * 0.5f;
        float canvasLeftEdge = -CanvasWidth * 0.5f;

        Assert.GreaterOrEqual(panelLeftEdge, canvasLeftEdge,
            "Panel left edge should not extend past the left edge of the canvas");
    }

    [Test]
    public void ClampPosition_DragPastLeftEdge_PositionXClampedToMinBound()
    {
        Vector2 result = DraggablePanel.ClampPosition(
            new Vector2(-5000f, 0f),
            new Vector2(PanelWidth, PanelHeight),
            DefaultPivot,
            CanvasWidth, CanvasHeight
        );

        float expectedMinX = -CanvasWidth * 0.5f + PanelWidth * 0.5f;

        Assert.AreEqual(expectedMinX, result.x, 0.001f,
            "Position X should be clamped to the minimum allowed value");
    }

    [Test]
    public void ClampPosition_DragPastRightEdge_PositionXClampedToMaxBound()
    {
        Vector2 result = DraggablePanel.ClampPosition(
            new Vector2(5000f, 0f),
            new Vector2(PanelWidth, PanelHeight),
            DefaultPivot,
            CanvasWidth, CanvasHeight
        );

        float expectedMaxX = CanvasWidth * 0.5f - PanelWidth * 0.5f;
        float panelRightEdge = result.x + PanelWidth * 0.5f;
        float canvasRightEdge = CanvasWidth * 0.5f;

        Assert.AreEqual(expectedMaxX, result.x, 0.001f,
            "Position X should be clamped to the maximum allowed value");
        Assert.LessOrEqual(panelRightEdge, canvasRightEdge,
            "Panel right edge should not extend past the right edge of the canvas");
    }

    [Test]
    public void ClampPosition_DragPastTopEdge_PositionYClampedToMaxBound()
    {
        Vector2 result = DraggablePanel.ClampPosition(
            new Vector2(0f, 5000f),
            new Vector2(PanelWidth, PanelHeight),
            DefaultPivot,
            CanvasWidth, CanvasHeight
        );

        float expectedMaxY = CanvasHeight * 0.5f - PanelHeight * 0.5f;

        Assert.AreEqual(expectedMaxY, result.y, 0.001f,
            "Position Y should be clamped to the maximum allowed value when dragged past the top edge");
    }

    [Test]
    public void ClampPosition_DragPastBottomEdge_PositionYClampedToMinBound()
    {
        Vector2 result = DraggablePanel.ClampPosition(
            new Vector2(0f, -5000f),
            new Vector2(PanelWidth, PanelHeight),
            DefaultPivot,
            CanvasWidth, CanvasHeight
        );

        float expectedMinY = -CanvasHeight * 0.5f + PanelHeight * 0.5f;

        Assert.AreEqual(expectedMinY, result.y, 0.001f,
            "Position Y should be clamped to the minimum allowed value when dragged past the bottom edge");
    }

    [Test]
    public void ClampPosition_WithinBounds_PositionUnchanged()
    {
        Vector2 inputPos = new Vector2(100f, -50f);

        Vector2 result = DraggablePanel.ClampPosition(
            inputPos,
            new Vector2(PanelWidth, PanelHeight),
            DefaultPivot,
            CanvasWidth, CanvasHeight
        );

        Assert.AreEqual(inputPos.x, result.x, 0.001f,
            "Position X should remain unchanged when within bounds");
        Assert.AreEqual(inputPos.y, result.y, 0.001f,
            "Position Y should remain unchanged when within bounds");
    }

    [Test]
    public void ClampPosition_LargePanelTallerThanCanvas_PositionClampsToZero()
    {
        Vector2 result = DraggablePanel.ClampPosition(
            new Vector2(2000f, 5000f),
            new Vector2(CanvasWidth + 200f, CanvasHeight + 100f),
            DefaultPivot,
            CanvasWidth, CanvasHeight
        );

        Assert.AreEqual(0f, result.x, 0.001f,
            "Position X should be 0 when panel is wider than canvas (centered)");
        Assert.AreEqual(0f, result.y, 0.001f,
            "Position Y should be 0 when panel is taller than canvas (centered)");
    }

    [Test]
    public void ClampPosition_PivotAtBottomLeft_DragPastLeftEdge_PositionXNotNegative()
    {
        Vector2 pivotBottomLeft = new Vector2(0f, 0f);

        Vector2 result = DraggablePanel.ClampPosition(
            new Vector2(-5000f, 0f),
            new Vector2(PanelWidth, PanelHeight),
            pivotBottomLeft,
            CanvasWidth, CanvasHeight
        );

        Assert.GreaterOrEqual(result.x, 0f,
            "With pivot at (0,0), position X should be >= 0 when clamped to left edge");
    }

    [Test]
    public void ClampPosition_DragToAllCorners_PanelsStaysFullyWithinCanvas()
    {
        Vector2[] extremePositions = new Vector2[]
        {
            new Vector2(-5000f, 5000f),
            new Vector2(5000f, 5000f),
            new Vector2(-5000f, -5000f),
            new Vector2(5000f, -5000f)
        };

        foreach (Vector2 inputPos in extremePositions)
        {
            Vector2 result = DraggablePanel.ClampPosition(
                inputPos,
                new Vector2(PanelWidth, PanelHeight),
                DefaultPivot,
                CanvasWidth, CanvasHeight
            );

            float leftEdge = result.x - PanelWidth * 0.5f;
            float rightEdge = result.x + PanelWidth * 0.5f;
            float topEdge = result.y + PanelHeight * 0.5f;
            float bottomEdge = result.y - PanelHeight * 0.5f;

            float canvasLeft = -CanvasWidth * 0.5f;
            float canvasRight = CanvasWidth * 0.5f;
            float canvasTop = CanvasHeight * 0.5f;
            float canvasBottom = -CanvasHeight * 0.5f;

            Assert.GreaterOrEqual(leftEdge, canvasLeft,
                $"Left edge should be within canvas. Input: {inputPos}");
            Assert.LessOrEqual(rightEdge, canvasRight,
                $"Right edge should be within canvas. Input: {inputPos}");
            Assert.LessOrEqual(topEdge, canvasTop,
                $"Top edge should be within canvas. Input: {inputPos}");
            Assert.GreaterOrEqual(bottomEdge, canvasBottom,
                $"Bottom edge should be within canvas. Input: {inputPos}");
        }
    }
}
