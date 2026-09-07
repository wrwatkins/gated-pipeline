import unittest
from decimal import Decimal
from amounts import total


class AmountTests(unittest.TestCase):
    def test_total_is_exact(self):
        self.assertEqual(total(['0.1', '0.2']), Decimal('0.3'))

    def test_nonfinite_input_is_rejected(self):
        with self.assertRaises(ValueError):
            total(['NaN'])
