using UnityEngine;

[RequireComponent(typeof(CharacterController))]
[RequireComponent(typeof(PlayerAnimator))]
public class PlayerController : MonoBehaviour
{
    [Header("移动参数")]
    [SerializeField] private float walkSpeed = 3f;
    [SerializeField] private float runSpeed = 6f;
    [SerializeField] private float rotationSpeed = 15f;

    [Header("跳跃参数")]
    [SerializeField] private float jumpForce = 8f;
    [SerializeField] private float gravity = -20f;
    [SerializeField] private float groundCheckDistance = 0.2f;
    [SerializeField] private LayerMask groundMask;

    [Header("跑步按键")]
    [SerializeField] private KeyCode runKey = KeyCode.LeftShift;

    [Header("动画过渡")]
    [SerializeField] private float speedAcceleration = 10f;
    [SerializeField] private float speedDeceleration = 15f;

    [Header("跳跃防连跳")]
    [SerializeField] private float jumpCooldown = 0.3f;

    [Header("技能按键")]
    [SerializeField] private KeyCode attackKey = KeyCode.Mouse0;
    [SerializeField] private KeyCode castSpellKey = KeyCode.Mouse1;

    private CharacterController controller;
    private PlayerAnimator playerAnimator;
    private Vector3 velocity;
    private bool isGrounded;
    private float currentSpeed;
    private float displaySpeed;
    private bool isJumping;
    private float jumpCooldownTimer;

    private void Awake()
    {
        controller = GetComponent<CharacterController>();
        playerAnimator = GetComponent<PlayerAnimator>();
    }

    private void Update()
    {
        GroundCheck();
        HandleMovement();
        HandleJump();
        HandleSkills();
        ApplyGravity();
        SmoothDisplaySpeed();
        UpdateCooldown();
        UpdateAnimatorParameters();
    }

    private void GroundCheck()
    {
        isGrounded = Physics.CheckSphere(transform.position + Vector3.up * 0.1f, groundCheckDistance, groundMask);
        
        if (isGrounded && velocity.y < 0)
        {
            velocity.y = -2f;
            if (isJumping)
            {
                isJumping = false;
                playerAnimator.OnLanded();
            }
        }
    }

    private void HandleMovement()
    {
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        Vector3 moveDirection = new Vector3(horizontal, 0f, vertical);
        
        if (moveDirection.magnitude >= 0.1f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(moveDirection);
            transform.rotation = Quaternion.Lerp(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
        }

        bool isRunning = Input.GetKey(runKey);
        float targetSpeed = isRunning ? runSpeed : walkSpeed;
        currentSpeed = moveDirection.magnitude > 0.1f ? targetSpeed : 0f;

        if (playerAnimator.IsUsingSkill)
        {
            currentSpeed = 0f;
        }

        if (currentSpeed > 0)
        {
            controller.Move(moveDirection.normalized * currentSpeed * Time.deltaTime);
        }
    }

    private void HandleSkills()
    {
        if (playerAnimator.IsUsingSkill) return;

        if (Input.GetKeyDown(attackKey))
        {
            playerAnimator.PlayAttack();
        }
        else if (Input.GetKeyDown(castSpellKey))
        {
            playerAnimator.PlayCastSpell();
        }
    }

    private void SmoothDisplaySpeed()
    {
        float smoothFactor = currentSpeed > displaySpeed ? speedAcceleration : speedDeceleration;
        displaySpeed = Mathf.Lerp(displaySpeed, currentSpeed, smoothFactor * Time.deltaTime);
    }

    private void UpdateCooldown()
    {
        if (jumpCooldownTimer > 0)
        {
            jumpCooldownTimer -= Time.deltaTime;
        }
    }

    private void HandleJump()
    {
        if (Input.GetKeyDown(KeyCode.Space) && isGrounded && !isJumping && jumpCooldownTimer <= 0)
        {
            velocity.y = Mathf.Sqrt(jumpForce * -2f * gravity);
            isJumping = true;
            jumpCooldownTimer = jumpCooldown;
            playerAnimator.OnJump();
        }
    }

    private void ApplyGravity()
    {
        velocity.y += gravity * Time.deltaTime;
        controller.Move(velocity * Time.deltaTime);
    }

    private void UpdateAnimatorParameters()
    {
        playerAnimator.UpdateSpeed(displaySpeed);
        playerAnimator.UpdateGrounded(isGrounded);
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position + Vector3.up * 0.1f, groundCheckDistance);
    }
}
