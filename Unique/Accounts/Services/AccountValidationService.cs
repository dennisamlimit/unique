using System.Text.RegularExpressions;

namespace Unique.Accounts.Services
{
    public sealed class AccountValidationService
    {
        private static readonly Regex EmailRegex = new Regex(
            @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase
        );

        private static readonly Regex NameRegex = new Regex(
            @"^[A-Za-zÄÖÜäöüß]{2,24}$",
            RegexOptions.Compiled
        );

        public bool IsValidName(string input) => !string.IsNullOrWhiteSpace(input) && NameRegex.IsMatch(input.Trim());

        public bool IsValidEmail(string input) => !string.IsNullOrWhiteSpace(input) && EmailRegex.IsMatch(input.Trim());
    }
}
