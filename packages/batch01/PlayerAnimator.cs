using UnityEngine;

[RequireComponent(typeof(Animator))]
public class PlayerAnimator : MonoBehaviour
{
    [Header("速度阈值")]
    [SerializeField] private float walkThreshold = 0.1f;
    [SerializeField] private float runThreshold = 4.5f;

    private Animator animator;
    private int speedHash;
    private int isGroundedHash;
    private int jumpHash;
    private int landHash;

    private void Awake()
    {
        animator = GetComponent<Animator>();
        CacheParameterHashes();
    }

    private void CacheParameterHashes()
    {
        speedHash = Animator.StringToHash("Speed");
        isGroundedHash = Animator.StringToHash("IsGrounded");
        jumpHash = Animator.StringToHash("Jump");
        landHash = Animator.StringToHash("Land");
    }

    public void UpdateSpeed(float currentSpeed)
    {
        animator.SetFloat(speedHash, currentSpeed);
    }

    public void UpdateGrounded(bool grounded)
    {
        animator.SetBool(isGroundedHash, grounded);
    }

    public void OnJump()
    {
        animator.SetTrigger(jumpHash);
    }

    public void OnLanded()
    {
        animator.SetTrigger(landHash);
    }
}
